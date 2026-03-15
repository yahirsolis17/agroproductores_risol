import sys
with open('scan_results_final.txt', 'w', encoding='utf-8') as f:
    sys.stdout = f
    import scan_encoding
