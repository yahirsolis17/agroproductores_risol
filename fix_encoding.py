import os

def fix_mojibake(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try to encode to cp1252 and decode to utf-8
    try:
        fixed_content = content.encode('cp1252').decode('utf-8')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed {filepath} successfully via cp1252 reversing.")
    except Exception as e:
        print(f"cp1252 reverse failed for {filepath}: {e}")
        # Manual fallback
        replacements = {
            "Ã³": "ó",
            "Ã¡": "á",
            "Ã©": "é",
            "Ã­": "í", # Note: there might be a hidden char here
            "Ãº": "ú",
            "Ã±": "ñ",
            "Ã‘": "Ñ",
            "Ã“": "Ó",
            "Ã": "í" # Sometimes í gets truncated
        }
        for k, v in replacements.items():
            content = content.replace(k, v)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath} via manual replacements.")

fix_mojibake(r"c:\Users\Yahir\agroproductores_risol\backend\gestion_bodega\utils\reporting.py")
fix_mojibake(r"c:\Users\Yahir\agroproductores_risol\frontend\src\modules\gestion_bodega\components\capturas\FastCaptureModal.tsx")
