"""
Database Updater Service - Preview and Update Logic
"""

from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone
from app.models.contact import Contact
from app.models.audit import BulkUpdateSnapshot
from app.services.identity_matcher import IdentityMatcher, IdentityMatchType
from app.services.email_normalizer import EmailNormalizer
from app.services.phone_normalizer import PhoneNormalizer


class UpdateMode:
    """Update modes"""
    REPLACE = "replace"
    APPEND = "append"


class DatabaseUpdater:
    """Handle database updates with preview"""
    
    def __init__(self):
        self.identity_matcher = IdentityMatcher()
        self.email_normalizer = EmailNormalizer()
        self.phone_normalizer = PhoneNormalizer()
    
    async def get_all_records(self, session: AsyncSession) -> List[Dict]:
        """Get all existing records from database"""
        result = await session.execute(select(Contact))
        contacts = result.scalars().all()
        
        return [
            {
                "id": c.id,
                "company": c.company,
                "name": c.name,
                "surname": c.surname,
                "email": c.email,
                "position": c.position,
                "phone": c.phone,
                "email_normalized": c.email_normalized,
                "phone_normalized": c.phone_normalized,
            }
            for c in contacts
        ]
    
    async def preview_changes(
        self,
        session: AsyncSession,
        new_records: List[Dict],
        update_mode: str
    ) -> Dict:
        """
        Preview database changes before updating.
        
        Returns:
            Dict with preview data including:
            - updates: List of records to update
            - new_records: List of new records to add
            - duplicates: List of duplicate records (append mode)
            - summary: Counts and statistics
        """
        # Get all existing records
        existing_records = await self.get_all_records(session)
        
        updates = []
        new_rows = []
        duplicates = []
        identity_conflicts = []
        
        summary = {
            "updated_count": 0,
            "new_count": 0,
            "duplicates_count": 0,
            "kept_count": len(existing_records),
            "identity_conflicts_count": 0,
        }
        
        existing_ids_processed = set()
        
        for new_record in new_records:
            email = new_record.get("Email")
            phone = new_record.get("Phone")
            
            # Find match
            matched_record, match_type, identity_conflict = self.identity_matcher.find_match(
                email, phone, existing_records
            )
            
            if update_mode == UpdateMode.REPLACE:
                if matched_record:
                    # Update existing record
                    update_data = {
                        "id": matched_record["id"],
                        "old_record": matched_record,
                        "new_record": new_record,
                        "match_type": match_type,
                        "identity_conflict": identity_conflict,
                        "changes": self._calculate_changes(matched_record, new_record),
                    }
                    updates.append(update_data)
                    existing_ids_processed.add(matched_record["id"])
                    
                    if identity_conflict:
                        identity_conflicts.append(update_data)
                        summary["identity_conflicts_count"] += 1
                    
                    summary["updated_count"] += 1
                else:
                    # New record
                    new_rows.append({
                        "record": new_record,
                        "match_type": IdentityMatchType.NEW,
                    })
                    summary["new_count"] += 1
            
            elif update_mode == UpdateMode.APPEND:
                if matched_record:
                    # Duplicate - skip
                    duplicates.append({
                        "record": new_record,
                        "match_type": match_type,
                        "existing_record": matched_record,
                    })
                    summary["duplicates_count"] += 1
                else:
                    # New record - add
                    new_rows.append({
                        "record": new_record,
                        "match_type": IdentityMatchType.NEW,
                    })
                    summary["new_count"] += 1
        
        # Update kept_count (records not in file)
        if update_mode == UpdateMode.REPLACE:
            summary["kept_count"] = len(existing_records) - len(existing_ids_processed)
        
        return {
            "updates": updates,
            "new_records": new_rows,
            "duplicates": duplicates,
            "identity_conflicts": identity_conflicts,
            "summary": summary,
        }
    
    def _calculate_changes(self, old_record: Dict, new_record: Dict) -> Dict[str, Dict]:
        """Calculate changes between old and new record"""
        changes = {}
        
        field_mapping = {
            "Company": "company",
            "Name": "name",
            "Surname": "surname",
            "Email": "email",
            "Position": "position",
            "Phone": "phone",
        }
        
        for new_key, old_key in field_mapping.items():
            old_value = old_record.get(old_key, "")
            new_value = new_record.get(new_key, "")
            
            if str(old_value) != str(new_value):
                changes[new_key] = {
                    "old": old_value,
                    "new": new_value,
                }
        
        return changes
    
    async def update_database(
        self,
        session: AsyncSession,
        preview_data: Dict,
        selected_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Update database with selected records.
        Creates a backup snapshot before making changes for rollback functionality.
        
        Args:
            session: Database session
            preview_data: Preview data from preview_changes
            selected_ids: List of record IDs to update (None = all)
        
        Returns:
            Dict with update results including snapshot_id
        """
        results = {
            "updated_count": 0,
            "inserted_count": 0,
            "skipped_count": 0,
            "errors": [],
            "snapshot_id": None,
        }
        
        # Step 1: Create backup snapshot of records that will be affected
        backup_records = []
        affected_ids = set()
        has_updates = False
        has_new_records = False
        
        # Collect IDs that will be updated
        for update_item in preview_data.get("updates", []):
            if selected_ids is None:
                affected_ids.add(update_item["id"])
                has_updates = True
            elif len(selected_ids) > 0 and update_item["id"] in selected_ids:
                affected_ids.add(update_item["id"])
                has_updates = True
        
        # Check if there are new records to be inserted
        for idx, new_item in enumerate(preview_data.get("new_records", [])):
            temp_id = idx + 10000
            if selected_ids is None:
                has_new_records = True
                break
            elif len(selected_ids) > 0 and temp_id in selected_ids:
                has_new_records = True
                break
        
        # Fetch current state of records that will be updated
        if affected_ids:
            result = await session.execute(
                select(Contact).where(Contact.id.in_(list(affected_ids)))
            )
            contacts_to_backup = result.scalars().all()
            
            for contact in contacts_to_backup:
                backup_records.append({
                    "id": contact.id,
                    "company": contact.company,
                    "name": contact.name,
                    "surname": contact.surname,
                    "email": contact.email,
                    "position": contact.position,
                    "phone": contact.phone,
                    "email_normalized": contact.email_normalized,
                    "phone_normalized": contact.phone_normalized,
                })
        
        # Create snapshot if there are updates OR new records (need to track for rollback)
        snapshot_id = None
        if has_updates or has_new_records:
            snapshot_name = f"Bulk Update - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            # Estimate what will happen (before actual update)
            estimated_updates = 0
            estimated_inserts = 0
            
            for update_item in preview_data.get("updates", []):
                if selected_ids is None or (len(selected_ids) > 0 and update_item["id"] in selected_ids):
                    estimated_updates += 1
            
            for idx, new_item in enumerate(preview_data.get("new_records", [])):
                temp_id = idx + 10000
                if selected_ids is None or (len(selected_ids) > 0 and temp_id in selected_ids):
                    estimated_inserts += 1
            
            update_details = {
                "estimated_updated_count": estimated_updates,
                "estimated_inserted_count": estimated_inserts,
                "total_backed_up_records": len(backup_records),
            }
            
            # Initialize empty backup_records if only new records (no updates)
            if not backup_records:
                backup_records = []
            
            # Store the preview data with changes for display in rollback UI
            # Filter preview_data to only include selected records
            filtered_preview_data = {
                "updates": [],
                "new_records": [],
                "summary": preview_data.get("summary", {}),
            }
            
            # Filter updates based on selected_ids
            for update_item in preview_data.get("updates", []):
                if selected_ids is None or (len(selected_ids) > 0 and update_item["id"] in selected_ids):
                    filtered_preview_data["updates"].append(update_item)
            
            # Filter new records based on selected_ids
            for idx, new_item in enumerate(preview_data.get("new_records", [])):
                temp_id = idx + 10000
                if selected_ids is None or (len(selected_ids) > 0 and temp_id in selected_ids):
                    filtered_preview_data["new_records"].append(new_item)
            
            snapshot = BulkUpdateSnapshot(
                snapshot_name=snapshot_name,
                records_backup=backup_records,
                update_details=update_details,
                changes_data=filtered_preview_data,
                rolled_back=0,
            )
            session.add(snapshot)
            await session.flush()  # Flush to get the ID
            snapshot_id = snapshot.id
        
        # Step 2: Process updates
        for update_item in preview_data.get("updates", []):
            # If selected_ids is None, process all. If provided but empty, skip all.
            if selected_ids is not None:
                if len(selected_ids) == 0 or update_item["id"] not in selected_ids:
                    results["skipped_count"] += 1
                    continue
            
            try:
                # Get existing record
                result = await session.execute(
                    select(Contact).where(Contact.id == update_item["id"])
                )
                contact = result.scalar_one_or_none()
                
                if not contact:
                    results["errors"].append(f"Record {update_item['id']} not found")
                    continue
                
                # Update fields
                new_record = update_item["new_record"]
                contact.company = new_record.get("Company", contact.company)
                contact.name = new_record.get("Name", contact.name)
                contact.surname = new_record.get("Surname", contact.surname)
                contact.email = new_record.get("Email", contact.email)
                contact.position = new_record.get("Position", contact.position)
                contact.phone = new_record.get("Phone", contact.phone)
                
                # Update normalized fields
                contact.email_normalized = self.email_normalizer.normalize(contact.email)
                contact.phone_normalized = self.phone_normalizer.normalize(contact.phone)
                
                # Explicitly update the updated_at timestamp to ensure it's always updated
                new_timestamp = datetime.now(timezone.utc)
                contact.updated_at = new_timestamp
                print(f"Bulk update: Setting updated_at for record {update_item['id']} to {new_timestamp}")
                
                results["updated_count"] += 1
            except Exception as e:
                results["errors"].append(f"Error updating record {update_item['id']}: {str(e)}")
        
        # Process new records
        # New records use temporary IDs (index + 10000) from frontend
        inserted_contacts = []  # Track Contact objects for newly inserted records
        for idx, new_item in enumerate(preview_data.get("new_records", [])):
            temp_id = idx + 10000  # Match frontend's temporary ID logic
            # If selected_ids is None, process all. If provided but empty, skip all.
            if selected_ids is not None:
                if len(selected_ids) == 0 or temp_id not in selected_ids:
                    results["skipped_count"] += 1
                    continue
            
            try:
                new_record = new_item["record"]
                
                # Create new contact
                contact = Contact(
                    company=new_record.get("Company", ""),
                    name=new_record.get("Name", ""),
                    surname=new_record.get("Surname", ""),
                    email=new_record.get("Email", ""),
                    position=new_record.get("Position"),
                    phone=new_record.get("Phone", ""),
                    email_normalized=self.email_normalizer.normalize(new_record.get("Email")),
                    phone_normalized=self.phone_normalizer.normalize(new_record.get("Phone")),
                )
                
                session.add(contact)
                inserted_contacts.append(contact)  # Track the contact object
                results["inserted_count"] += 1
            except Exception as e:
                results["errors"].append(f"Error inserting record: {str(e)}")
        
        # Flush to get IDs of newly inserted records
        inserted_contact_ids = []
        if inserted_contacts:
            await session.flush()  # Flush to get IDs assigned
            # Get IDs from the contact objects after flush
            for contact in inserted_contacts:
                if contact.id:
                    inserted_contact_ids.append(contact.id)
        
        # Update snapshot with inserted record IDs if snapshot exists
        if snapshot_id and inserted_contact_ids:
            snapshot_result = await session.execute(
                select(BulkUpdateSnapshot).where(BulkUpdateSnapshot.id == snapshot_id)
            )
            snapshot = snapshot_result.scalar_one_or_none()
            if snapshot:
                if snapshot.update_details is None:
                    snapshot.update_details = {}
                snapshot.update_details["inserted_record_ids"] = inserted_contact_ids
                # Mark JSON field as modified so SQLAlchemy detects the change
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(snapshot, "update_details")
                await session.flush()
        
        # Commit changes
        try:
            await session.commit()
            results["snapshot_id"] = snapshot_id
        except Exception as e:
            await session.rollback()
            results["errors"].append(f"Database commit error: {str(e)}")
            # If commit fails, delete the snapshot if it was created
            if snapshot_id:
                try:
                    snapshot_result = await session.execute(
                        select(BulkUpdateSnapshot).where(BulkUpdateSnapshot.id == snapshot_id)
                    )
                    snapshot_to_delete = snapshot_result.scalar_one_or_none()
                    if snapshot_to_delete:
                        await session.delete(snapshot_to_delete)
                        await session.commit()
                except:
                    await session.rollback()
                    pass
        
        return results
    
    async def rollback_snapshot(
        self,
        session: AsyncSession,
        snapshot_id: int
    ) -> Dict:
        """
        Rollback database to a previous snapshot state.
        
        Args:
            session: Database session
            snapshot_id: ID of the snapshot to rollback to
        
        Returns:
            Dict with rollback results
        """
        results = {
            "success": False,
            "message": "",
            "restored_count": 0,
            "deleted_count": 0,
            "errors": [],
        }
        
        try:
            # Get snapshot
            result = await session.execute(
                select(BulkUpdateSnapshot).where(BulkUpdateSnapshot.id == snapshot_id)
            )
            snapshot = result.scalar_one_or_none()
            
            if not snapshot:
                results["message"] = "Snapshot not found"
                return results
            
            if snapshot.rolled_back == 1:
                results["message"] = "This snapshot has already been rolled back"
                return results
            
            # Get backup records
            backup_records = snapshot.records_backup or []
            update_details = snapshot.update_details or {}
            inserted_record_ids = update_details.get("inserted_record_ids", [])
            
            if not backup_records and not inserted_record_ids:
                results["message"] = "No backup records or inserted records found in snapshot"
                return results
            
            # Debug: Log what we're about to rollback
            print(f"Rollback: backup_records count: {len(backup_records)}, inserted_record_ids: {inserted_record_ids}")
            
            # Step 1: Delete newly inserted records
            deleted_count = 0
            if inserted_record_ids:
                print(f"Attempting to delete {len(inserted_record_ids)} inserted records: {inserted_record_ids}")
                for record_id in inserted_record_ids:
                    try:
                        result = await session.execute(
                            select(Contact).where(Contact.id == record_id)
                        )
                        contact = result.scalar_one_or_none()
                        
                        if contact:
                            print(f"Deleting record ID: {record_id} - {contact.email}")
                            await session.delete(contact)
                            deleted_count += 1
                        else:
                            print(f"Record ID {record_id} not found in database")
                            results["errors"].append(f"Record {record_id} not found for deletion")
                    except Exception as e:
                        print(f"Error deleting record {record_id}: {str(e)}")
                        results["errors"].append(f"Error deleting inserted record {record_id}: {str(e)}")
                print(f"Successfully deleted {deleted_count} records")
            
            # Step 2: Restore updated records
            restored_count = 0
            for backup_record in backup_records:
                try:
                    # Get current record
                    result = await session.execute(
                        select(Contact).where(Contact.id == backup_record["id"])
                    )
                    contact = result.scalar_one_or_none()
                    
                    if contact:
                        # Restore all fields
                        contact.company = backup_record["company"]
                        contact.name = backup_record["name"]
                        contact.surname = backup_record["surname"]
                        contact.email = backup_record["email"]
                        contact.position = backup_record["position"]
                        contact.phone = backup_record["phone"]
                        contact.email_normalized = backup_record["email_normalized"]
                        contact.phone_normalized = backup_record["phone_normalized"]
                        restored_count += 1
                    else:
                        # Record was deleted, we need to recreate it
                        contact = Contact(
                            id=backup_record["id"],
                            company=backup_record["company"],
                            name=backup_record["name"],
                            surname=backup_record["surname"],
                            email=backup_record["email"],
                            position=backup_record["position"],
                            phone=backup_record["phone"],
                            email_normalized=backup_record["email_normalized"],
                            phone_normalized=backup_record["phone_normalized"],
                        )
                        session.add(contact)
                        restored_count += 1
                except Exception as e:
                    results["errors"].append(f"Error restoring record {backup_record.get('id')}: {str(e)}")
            
            # Mark snapshot as rolled back
            snapshot.rolled_back = 1
            
            # Commit changes
            await session.commit()
            
            results["success"] = True
            if deleted_count > 0 and restored_count > 0:
                results["message"] = f"Successfully rolled back: restored {restored_count} records and deleted {deleted_count} newly inserted records"
            elif deleted_count > 0:
                results["message"] = f"Successfully rolled back: deleted {deleted_count} newly inserted records"
            else:
                results["message"] = f"Successfully rolled back: restored {restored_count} records"
            results["restored_count"] = restored_count
            results["deleted_count"] = deleted_count
            
        except Exception as e:
            await session.rollback()
            results["message"] = f"Error during rollback: {str(e)}"
            results["errors"].append(str(e))
        
        return results
    
    async def get_all_snapshots(
        self,
        session: AsyncSession
    ) -> List[Dict]:
        """
        Get all bulk update snapshots.
        
        Args:
            session: Database session
        
        Returns:
            List of snapshot dictionaries
        """
        try:
            result = await session.execute(
                select(BulkUpdateSnapshot).order_by(BulkUpdateSnapshot.timestamp.desc())
            )
            snapshots = result.scalars().all()
            
            return [
                {
                    "id": s.id,
                    "snapshot_name": s.snapshot_name,
                    "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                    "update_details": s.update_details,
                    "rolled_back": bool(s.rolled_back),
                    "records_count": len(s.records_backup) if s.records_backup else 0,
                    "changes_data": s.changes_data,
                }
                for s in snapshots
            ]
        except Exception as e:
            return []
    
    async def get_snapshot(
        self,
        session: AsyncSession,
        snapshot_id: int
    ) -> Optional[Dict]:
        """
        Get a specific snapshot by ID.
        
        Args:
            session: Database session
            snapshot_id: ID of the snapshot
        
        Returns:
            Snapshot dictionary or None
        """
        try:
            result = await session.execute(
                select(BulkUpdateSnapshot).where(BulkUpdateSnapshot.id == snapshot_id)
            )
            snapshot = result.scalar_one_or_none()
            
            if not snapshot:
                return None
            
            return {
                "id": snapshot.id,
                "snapshot_name": snapshot.snapshot_name,
                "timestamp": snapshot.timestamp.isoformat() if snapshot.timestamp else None,
                "update_details": snapshot.update_details,
                "rolled_back": bool(snapshot.rolled_back),
                "records_backup": snapshot.records_backup,
                "records_count": len(snapshot.records_backup) if snapshot.records_backup else 0,
                "changes_data": snapshot.changes_data,
            }
        except Exception as e:
            return None
    
    async def delete_snapshot(
        self,
        session: AsyncSession,
        snapshot_id: int
    ) -> Dict:
        """
        Delete a specific snapshot.
        
        Args:
            session: Database session
            snapshot_id: ID of the snapshot to delete
        
        Returns:
            Dict with deletion results
        """
        results = {
            "success": False,
            "message": "",
        }
        
        try:
            # Get snapshot
            result = await session.execute(
                select(BulkUpdateSnapshot).where(BulkUpdateSnapshot.id == snapshot_id)
            )
            snapshot = result.scalar_one_or_none()
            
            if not snapshot:
                results["message"] = "Snapshot not found"
                return results
            
            # Delete snapshot
            await session.delete(snapshot)
            await session.commit()
            
            results["success"] = True
            results["message"] = "Snapshot deleted successfully"
            
        except Exception as e:
            await session.rollback()
            results["message"] = f"Error deleting snapshot: {str(e)}"
        
        return results
    
    async def delete_all_snapshots(
        self,
        session: AsyncSession,
        older_than_days: Optional[int] = None
    ) -> Dict:
        """
        Delete all snapshots, optionally filtered by age.
        
        Args:
            session: Database session
            older_than_days: If provided, only delete snapshots older than this many days
        
        Returns:
            Dict with deletion results
        """
        results = {
            "success": False,
            "message": "",
            "deleted_count": 0,
        }
        
        try:
            from datetime import datetime, timedelta
            
            query = select(BulkUpdateSnapshot)
            
            # Filter by age if specified
            if older_than_days is not None:
                cutoff_date = datetime.now() - timedelta(days=older_than_days)
                query = query.where(BulkUpdateSnapshot.timestamp < cutoff_date)
            
            result = await session.execute(query)
            snapshots = result.scalars().all()
            
            deleted_count = 0
            for snapshot in snapshots:
                await session.delete(snapshot)
                deleted_count += 1
            
            await session.commit()
            
            results["success"] = True
            results["deleted_count"] = deleted_count
            if older_than_days:
                results["message"] = f"Deleted {deleted_count} snapshots older than {older_than_days} days"
            else:
                results["message"] = f"Deleted {deleted_count} snapshots"
            
        except Exception as e:
            await session.rollback()
            results["message"] = f"Error deleting snapshots: {str(e)}"
        
        return results

