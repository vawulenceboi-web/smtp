import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from datetime import datetime


class SupabaseDB:
    """Supabase database client for SMTP app"""
    
    _instance: Optional["SupabaseDB"] = None
    
    def __init__(self):
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.key: str = os.getenv("SUPABASE_KEY", "")
        
        if not self.url or not self.key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY environment variables must be set"
            )
        
        self.client: Client = create_client(self.url, self.key)
    
    @classmethod
    def get_instance(cls) -> "SupabaseDB":
        """Singleton pattern for database connection"""
        if cls._instance is None:
            cls._instance = SupabaseDB()
        return cls._instance
    
    # RELAYS METHODS
    
    async def create_relay(self, relay_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new SMTP relay configuration"""
        try:
            response = self.client.table("relays").insert(relay_data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to create relay: {str(e)}")
    
    async def get_relay(self, relay_id: str) -> Dict[str, Any]:
        """Get a specific relay by ID"""
        try:
            response = self.client.table("relays").select("*").eq("id", relay_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to get relay: {str(e)}")
    
    async def list_relays(self) -> List[Dict[str, Any]]:
        """List all SMTP relays"""
        try:
            response = self.client.table("relays").select("*").execute()
            return response.data or []
        except Exception as e:
            raise Exception(f"Failed to list relays: {str(e)}")
    
    async def update_relay(self, relay_id: str, relay_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a relay configuration"""
        try:
            relay_data["updated_at"] = datetime.utcnow().isoformat()
            response = self.client.table("relays").update(relay_data).eq("id", relay_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to update relay: {str(e)}")
    
    async def delete_relay(self, relay_id: str) -> bool:
        """Delete a relay"""
        try:
            self.client.table("relays").delete().eq("id", relay_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete relay: {str(e)}")
    
    # TEMPLATES METHODS
    
    async def create_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new email template"""
        try:
            response = self.client.table("templates").insert(template_data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to create template: {str(e)}")
    
    async def get_template(self, template_id: str) -> Dict[str, Any]:
        """Get a specific template by ID"""
        try:
            response = self.client.table("templates").select("*").eq("id", template_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to get template: {str(e)}")
    
    async def list_templates(self) -> List[Dict[str, Any]]:
        """List all email templates"""
        try:
            response = self.client.table("templates").select("*").execute()
            return response.data or []
        except Exception as e:
            raise Exception(f"Failed to list templates: {str(e)}")
    
    async def update_template(self, template_id: str, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a template"""
        try:
            template_data["updated_at"] = datetime.utcnow().isoformat()
            response = self.client.table("templates").update(template_data).eq("id", template_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to update template: {str(e)}")
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        try:
            self.client.table("templates").delete().eq("id", template_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete template: {str(e)}")
    
    # CAMPAIGNS METHODS
    
    async def create_campaign(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new campaign"""
        try:
            response = self.client.table("campaigns").insert(campaign_data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to create campaign: {str(e)}")
    
    async def get_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Get a specific campaign"""
        try:
            response = self.client.table("campaigns").select("*").eq("id", campaign_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to get campaign: {str(e)}")
    
    async def list_campaigns(self) -> List[Dict[str, Any]]:
        """List all campaigns"""
        try:
            response = self.client.table("campaigns").select("*").execute()
            return response.data or []
        except Exception as e:
            raise Exception(f"Failed to list campaigns: {str(e)}")
    
    async def update_campaign(self, campaign_id: str, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a campaign"""
        try:
            campaign_data["updated_at"] = datetime.utcnow().isoformat()
            response = self.client.table("campaigns").update(campaign_data).eq("id", campaign_id).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to update campaign: {str(e)}")
    
    # CAMPAIGN RECIPIENTS METHODS
    
    async def create_recipient(self, recipient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a campaign recipient record"""
        try:
            response = self.client.table("campaign_recipients").insert(recipient_data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to create recipient: {str(e)}")
    
    async def update_recipient_status(
        self, campaign_id: str, email: str, status: str, provider: str = ""
    ) -> Dict[str, Any]:
        """Update recipient email status"""
        try:
            response = (
                self.client.table("campaign_recipients")
                .update({"status": status, "provider": provider, "updated_at": datetime.utcnow().isoformat()})
                .eq("campaign_id", campaign_id)
                .eq("email", email)
                .execute()
            )
            return response.data[0] if response.data else {}
        except Exception as e:
            raise Exception(f"Failed to update recipient status: {str(e)}")
    
    async def get_campaign_recipients(self, campaign_id: str) -> List[Dict[str, Any]]:
        """Get all recipients for a campaign"""
        try:
            response = self.client.table("campaign_recipients").select("*").eq("campaign_id", campaign_id).execute()
            return response.data or []
        except Exception as e:
            raise Exception(f"Failed to get campaign recipients: {str(e)}")


def get_db() -> SupabaseDB:
    """Get the Supabase database instance"""
    return SupabaseDB.get_instance()
