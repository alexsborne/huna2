#!/usr/bin/env bash
# Reconstrói o painel a partir dos fontes desta pasta.
# Requer: python3 (3.9+, com zoneinfo). Nenhuma dependência externa.
# Entradas:  head2.html, body2.html, a1..a7.js, chart.min.js, jspdf.js, autotable.js,
#            logo_b64.txt, ../dados/rows.json, ../dados/catmap.json
# Saídas:    Painel_Funil_de_Pasta_Nexo.html (standalone), artifact_body2.html (sem <html>/<head>)
python3 rebuild2.py
