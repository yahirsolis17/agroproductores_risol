import os
import re

frontend_dir = r"c:\Users\Yahir\agroproductores_risol\frontend\src"
backend_dir = r"c:\Users\Yahir\agroproductores_risol\backend"

ignore_dirs = {"venv", "__pycache__", "migrations", ".git", "node_modules", "dist", "build"}

# Look for variable/function names with non-ascii characters.
# A basic regex for an identifier that contains non-ASCII characters:
# Python/JS identifier: start with letter/_, followed by letters/_/digits.
# Non-ASCII letter: [^\x00-\x7F]
# Regex: \b[a-zA-Z_]*[^\x00-\x7F\W_]+[a-zA-Z0-9_]*\b
# Actually \w matches non-ASCII in Python 3 by default. 
# So we can find \w+ and check if it contains non-ASCII and is not inside a string.

# We will just print any line that has non-ASCII, but we will highlight corrupted patterns.
corrupted = ["Ã±", "Ã¡", "Ã©", "Ã", "Ã³", "Ãº", "Ã‘"]

print("--- SCANNING FOR CORRUPTED ACCENTS ---")
for base in [frontend_dir, backend_dir]:
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for f in files:
            if f.endswith(('.ts', '.tsx', '.py', '.html')):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        lines = file.readlines()
                        for i, line in enumerate(lines):
                            for c in corrupted:
                                if c in line:
                                    print(f"CORRUPTED {f}:{i+1} -> {line.strip()}")
                                    break
                except UnicodeDecodeError:
                    print(f"NOT UTF-8: {path}")

print("\n--- SCANNING FOR VARIABLES WITH ACCENTS ---")
import ast
# For python, we can use ast to find variable names and function names
for root, dirs, files in os.walk(backend_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                try:
                    tree = ast.parse(file.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef) or isinstance(node, ast.ClassDef):
                            if not node.name.isascii():
                                print(f"NON-ASCII DEF {f} -> {node.name}")
                        elif isinstance(node, ast.Name):
                            if not node.id.isascii():
                                print(f"NON-ASCII VAR {f} -> {node.id}")
                        elif isinstance(node, ast.arg):
                            if not node.arg.isascii():
                                print(f"NON-ASCII ARG {f} -> {node.arg}")
                except Exception:
                    pass

print("\n--- SCANNING FRONTEND FOR NON-ASCII IDENTIFIERS ---")
# Simple regex for JS/TS identifiers with non-ascii:
ident_re = re.compile(r'^[a-zA-Z_$]*[^\x00-\x7F\W]+[\w$]*$')
for root, dirs, files in os.walk(frontend_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                try:
                    content = file.read()
                    # extract words not in quotes (very naive, but just removes string literals)
                    content_no_strings = re.sub(r'(["\'])(?:(?=(\\?))\2.)*?\1', '', content)
                    content_no_comments = re.sub(r'//.*|/\*[\s\S]*?\*/', '', content_no_strings)
                    words = re.findall(r'[\w$]+', content_no_comments)
                    non_ascii_words = set(w for w in words if not w.isascii())
                    if non_ascii_words:
                        print(f"NON-ASCII IDENT {f} -> {non_ascii_words}")
                except Exception:
                    pass
