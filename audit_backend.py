import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
TELEFONO = "1234567890"
PASSWORD = "testpassword123"

def get_token():
    url = f"{BASE_URL}/api/token/"
    try:
        response = requests.post(url, data={"telefono": TELEFONO, "password": PASSWORD})
        response.raise_for_status()
        return response.json().get("access")
    except Exception as e:
        print(f"Error getting token: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}")
        return None

def run_audit():
    token = get_token()
    if not token:
        print("Aborting audit due to login failure.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        # 2.1 Recepciones list
        {
            "name": "Recepciones List (No Filter)",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/recepciones/?page=1&page_size=10"
        },
        # 2.1 Recepciones list with filters (using correct logic: check response)
        # User mentioned params: bodega=15&temporada=6 is likely wrong, should be bodega_id/temporada_id
        # But we will test what user asked: bodega=15&temporada=6 to see "sanity"
        {
            "name": "Recepciones List (User Params)",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/recepciones/?page=1&page_size=10&bodega=15&temporada=6"
        },
         {
            "name": "Recepciones List (Correct Params ID)",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/recepciones/?page=1&page_size=10&bodega_id=15&temporada_id=6"
        },
        # 3.1 Empaques Disponibles
        {
            "name": "Empaques Disponibles",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/empaques/disponibles/?bodega_id=15&temporada_id=6"
        },
        # 4.1 Camiones List
        {
            "name": "Camiones List (All)",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/camiones/?page=1&page_size=10"
        },
         {
            "name": "Camiones List (Borrador)",
            "method": "GET",
            "url": f"{BASE_URL}/bodega/camiones/?estado=BORRADOR"
        },
    ]

    results = {}

    for ep in endpoints:
        print(f"Testing {ep['name']}...")
        try:
            res = requests.get(ep['url'], headers=headers)
            print(f"Status: {res.status_code}")
            try:
                data = res.json()
            except:
                data = res.text
            
            results[ep['name']] = {
                "status": res.status_code,
                "url": ep['url'],
                "data": data
            }
        except Exception as e:
            results[ep['name']] = {"error": str(e)}

    # Save details
    with open("audit_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("Audit finished. Results in audit_results.json")

    # If recepciones list has results, get the first ID to check details (3.2)
    rec_data = results.get("Recepciones List (No Filter)", {}).get("data", {})
    if isinstance(rec_data, dict) and 'results' in rec_data and rec_data['results']:
        first_id = rec_data['results'][0]['id']
        print(f"Checking details for Recepcion ID {first_id}...")
        url = f"{BASE_URL}/bodega/recepciones/{first_id}/"
        res = requests.get(url, headers=headers)
        with open("recepcion_detail.json", "w", encoding="utf-8") as f:
             try:
                json.dump(res.json(), f, indent=2)
             except:
                f.write(res.text)

if __name__ == "__main__":
    run_audit()
