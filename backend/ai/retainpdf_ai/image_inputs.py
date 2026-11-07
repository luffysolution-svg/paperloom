"""Validated image content for ACP, Chat Completions, Responses and Messages."""
import base64

from fastapi import HTTPException


def image_inputs(attachments):
    images = []
    for attachment in attachments or []:
        mime = attachment.get("mime_type", "")
        data = attachment.get("data", "")
        if mime not in {"image/png", "image/jpeg", "image/webp"} or not isinstance(data, str) or len(data) > 4_000_000:
            raise HTTPException(400, "图片格式或大小不受支持，请使用小于 3 MB 的 PNG、JPEG 或 WebP 图片。")
        try:
            raw = base64.b64decode(data, validate=True)
        except (ValueError, TypeError):
            raise HTTPException(400, "图片内容无效，请重新添加图片。") from None
        if not raw:
            raise HTTPException(400, "图片内容为空。")
        images.append({"type": "image", "data": data, "mimeType": mime})
    return images


def chat_images(images):
    return [{"type": "image_url", "image_url": {"url": f"data:{image['mimeType']};base64,{image['data']}"}} for image in images]
