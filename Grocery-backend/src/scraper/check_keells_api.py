import requests

url = "https://zebraliveback.keellssuper.com/1.0/Showcase/GetItemDetailsForCampaign"

params = {
    "campaignKeyWord": "keells_products",
    "fromCount": 0,
    "toCount": 300,
    "locationCode": "SCDR",
    "brandId": "",
    "sortBy": "price_ASC",
    "departmentId": "",
    "subDepartmentId": "",
    "categoryId": "",
    "itemCode": "",
    "campaignGroupID": "",
}

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://www.keellssuper.com",
    "Referer": "https://www.keellssuper.com/",
}

r = requests.get(url, params=params, headers=headers, timeout=30)
print("Status:", r.status_code)

# If it fails, print response text to see why
if r.status_code != 200:
    print(r.text)
    raise SystemExit(1)

data = r.json()

items = data.get("result", {}).get("itemDetailsList", [])
print("Items returned:", len(items))

# Print first 5 items nicely
for it in items[:50]:
    print(f"- {it.get('name')} | Rs {it.get('amount')} | stock {it.get('stockInHand')} | code {it.get('itemCode')}")
