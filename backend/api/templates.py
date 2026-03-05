from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..database import get_db, SupabaseDB

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    name: str
    category: Optional[str] = None
    subject: str
    body_content: str
    reply_to: Optional[str] = None
    in_reply_to_id: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body_content: Optional[str] = None
    reply_to: Optional[str] = None
    in_reply_to_id: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    subject: str
    body_content: str
    reply_to: Optional[str] = None
    in_reply_to_id: Optional[str] = None
    usage_count: int = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=TemplateResponse)
async def create_template(template: TemplateCreate, db: SupabaseDB = Depends(get_db)):
    """Create a new email template"""
    try:
        template_data = template.model_dump()
        template_data["created_at"] = datetime.utcnow().isoformat()
        template_data["updated_at"] = datetime.utcnow().isoformat()
        template_data["usage_count"] = 0
        
        result = await db.create_template(template_data)
        return TemplateResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("", response_model=List[TemplateResponse])
async def list_templates(db: SupabaseDB = Depends(get_db)):
    """List all email templates"""
    try:
        templates = await db.list_templates()
        return [TemplateResponse(**template) for template in templates]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, db: SupabaseDB = Depends(get_db)):
    """Get a specific template by ID"""
    try:
        template = await db.get_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return TemplateResponse(**template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str, template: TemplateUpdate, db: SupabaseDB = Depends(get_db)
):
    """Update a template"""
    try:
        # Check if template exists
        existing = await db.get_template(template_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template_data = template.model_dump(exclude_unset=True)
        template_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = await db.update_template(template_id, template_data)
        return TemplateResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/{template_id}")
async def delete_template(template_id: str, db: SupabaseDB = Depends(get_db)):
    """Delete a template"""
    try:
        # Check if template exists
        existing = await db.get_template(template_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        await db.delete_template(template_id)
        return {"status": "success", "message": "Template deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
