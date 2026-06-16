import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.config import get_settings
from app.models.lead import WebAnalyst
from app.utils.auth import get_current_web_analyst
from pydantic import BaseModel

router = APIRouter(prefix="/export-pdf", tags=["export-pdf"])

BROWSERLESS_PDF_URL = "https://chrome.browserless.io/pdf"


class ExportPdfPayload(BaseModel):
    html: str
    filename: str
    header_template: str | None = None
    footer_template: str | None = None


@router.post("")
async def export_pdf(
    payload: ExportPdfPayload,
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> Response:
    settings = get_settings()
    if not settings.browserless_api_key:
        raise HTTPException(status_code=500, detail="BROWSERLESS_API_KEY not configured")

    browserless_payload = {
        "html": payload.html,
        "options": {
            "format": "A4",
            "printBackground": True,
            # Chrome only honors the `margin` option below when this is true —
            # keep it true even with empty templates so the top margin applies.
            "displayHeaderFooter": True,
            "headerTemplate": payload.header_template or "<span></span>",
            "footerTemplate": payload.footer_template or "<span></span>",
            "margin": {
                # Small baseline top margin so content on a new page (after a
                # break) doesn't render flush against the page edge.
                "top": "60px" if payload.header_template else "24px",
                "bottom": "50px" if payload.footer_template else "0px",
                "left": "0px",
                "right": "0px",
            },
        },
    }

    try:
        async with httpx.AsyncClient() as http:
            r = await http.post(
                BROWSERLESS_PDF_URL,
                params={"token": settings.browserless_api_key},
                json=browserless_payload,
                timeout=90.0,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="PDF rendering timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach Browserless: {e}")

    if not r.is_success:
        raise HTTPException(
            status_code=502, detail=f"Browserless returned {r.status_code}: {r.text[:500]}"
        )

    return Response(
        content=r.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{payload.filename}"'},
    )
