import json
import urllib.parse
import urllib.request

from embedding_client import EmbeddingConfig, embed_texts


def list_models(config):
    if config.provider == "gemini":
        url = f"{config.base_url}/models?key={urllib.parse.quote(config.api_key)}"
        headers = {}
    else:
        url = config.base_url + "/models"
        headers = {"Authorization": f"Bearer {config.api_key}"}
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=config.timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def redact(message, config):
    text = str(message)
    if config.api_key:
        text = text.replace(config.api_key, "***")
    return text


def main():
    config = EmbeddingConfig().require_key()
    print(f"Cấu hình: {json.dumps(config.summary(), ensure_ascii=False)}")

    try:
        models = list_models(config)
        identifiers = [item.get("id", "") for item in models.get("data", [])]
        embedding_models = [
            model
            for model in identifiers
            if "embed" in model.lower() or "nomic" in model.lower()
        ]
        print(f"Model embedding trong /models: {embedding_models or 'không thấy'}")
    except Exception as error:
        print(f"Không đọc được /models: {redact(error, config)}")

    texts = ["Canine vaccination guidelines", "Phác đồ tiêm phòng cho chó"]
    try:
        vectors = embed_texts(texts, task="document", config=config)
    except Exception as error:
        print(f"LỖI EMBEDDING: {redact(error, config)}")
        print("Nếu lỗi 404: thử EMBED_MODEL=nomic-embed-text-v1.5.")
        print("Hoặc đổi EMBED_PROVIDER sang openai/gemini.")
        raise SystemExit(1)

    print(f"OK: {len(vectors)} vector, dimension={len(vectors[0])}")
    for text, vector in zip(texts, vectors):
        print(f"  {text!r}: {vector[:3]}...")


if __name__ == "__main__":
    main()
