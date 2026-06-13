import json
import urllib.request
import urllib.parse
import time
import re
import os
import sys

# Free Google Translate API endpoint
API_URL = "https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q={q}"

# Cache to store translations and avoid redundant API calls
translation_cache = {}

def clean_placeholder_spacing(text, placeholders):
    """
    Cleans up any spacing issues introduced by Google Translate around placeholders.
    For example: "{ count } " -> "{count}"
    """
    for placeholder in placeholders:
        # Create a regex to match the placeholder with optional spaces inside braces
        # e.g., if placeholder is "{count}", match "{\s*count\s*}"
        escaped = re.escape(placeholder)
        # Replace spaces inside braces
        pattern = escaped.replace(r'\{', r'\{\s*').replace(r'\}', r'\s*\}')
        text = re.sub(pattern, placeholder, text)
    return text

def translate_text(text, sl, tl):
    if not text.strip():
        return text
    
    cache_key = f"{sl}:{tl}:{text}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    
    # 1. Identify and extract placeholders (e.g. {count}, {{name}})
    placeholders = re.findall(r'\{\{.*?\}\}|\{[^{}]*\}', text)
    
    # 2. Replace placeholders with temporary tokens
    temp_text = text
    for i, p in enumerate(placeholders):
        temp_text = temp_text.replace(p, f" _P_{i}_ ")
        
    # 3. Call translation API
    encoded_q = urllib.parse.quote(temp_text)
    url = API_URL.format(sl=sl, tl=tl, q=encoded_q)
    
    max_retries = 3
    retry_delay = 1
    translated_part = None
    
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res = json.loads(response.read().decode('utf-8'))
                # Extract translated text
                parts = []
                for sentence in res[0]:
                    if sentence[0]:
                        parts.append(sentence[0])
                translated_part = "".join(parts)
                break
        except Exception as e:
            print(f"Error translating text (attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                # Fallback to original text if translation fails
                translated_part = temp_text
                
    if not translated_part:
        translated_part = temp_text
        
    # 4. Restore placeholders
    result_text = translated_part
    for i, p in enumerate(placeholders):
        result_text = result_text.replace(f"_P_{i}_", p)
        # Fallback if Google Translate removed spaces around it
        result_text = result_text.replace(f"_P_{i}_".strip(), p)
        
    # Clean up spacing around placeholders if translation messed it up
    result_text = clean_placeholder_spacing(result_text, placeholders)
    
    # Clean up double spaces that might have been introduced
    result_text = re.sub(r'\s+', ' ', result_text).strip()
    
    # Cache and return
    translation_cache[cache_key] = result_text
    return result_text

def translate_json(data, sl, tl, path=""):
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            new_path = f"{path}.{k}" if path else k
            new_dict[k] = translate_json(v, sl, tl, new_path)
        return new_dict
    elif isinstance(data, list):
        return [translate_json(item, sl, tl, f"{path}[{i}]") for i, item in enumerate(data)]
    elif isinstance(data, str):
        # Avoid translating pure numbers or keys that shouldn't be translated
        if data.strip().isdigit():
            return data
        print(f"Translating: [{path}] -> {data[:30]}...")
        # Control rate limit by sleeping slightly
        time.sleep(0.02)
        return translate_text(data, sl, tl)
    else:
        return data

def main():
    if len(sys.argv) < 5:
        print("Usage: python3 translate_i18n.py <source_file> <target_file> <source_lang> <target_lang>")
        sys.exit(1)
        
    source_file = sys.argv[1]
    target_file = sys.argv[2]
    source_lang = sys.argv[3]
    target_lang = sys.argv[4]
    
    if not os.path.exists(source_file):
        print(f"Source file {source_file} does not exist.")
        sys.exit(1)
        
    print(f"Reading {source_file}...")
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
        
    print(f"Starting translation from '{source_lang}' to '{target_lang}'...")
    translated_data = translate_json(source_data, source_lang, target_lang)
    
    # Ensure target directory exists
    os.makedirs(os.path.dirname(target_file), exist_ok=True)
    
    print(f"Writing translated JSON to {target_file}...")
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)
        
    print(f"Translation complete! Saved to {target_file}")

if __name__ == "__main__":
    main()
