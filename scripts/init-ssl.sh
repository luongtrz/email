#!/bin/bash

# Script lay SSL certificate tu Let's Encrypt
# Su dung voi sslip.io hoac traefik.me

# Thay doi domain o day (vi du: email.1.2.3.4.sslip.io)
DOMAIN="${1:-your-domain.sslip.io}"
EMAIL="${2:-your-email@example.com}"

echo "=== Dang tao SSL certificate cho: $DOMAIN ==="

# Tao thu muc certbot
mkdir -p certbot/conf certbot/www

# Chay certbot trong docker de lay certificate
docker run --rm -it \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email

# Kiem tra ket qua
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "=== Thanh cong! SSL certificate da duoc tao ==="
    echo "Domain: $DOMAIN"
    echo "Certificate: certbot/conf/live/$DOMAIN/fullchain.pem"
    echo ""
    echo "Cap nhat nginx/nginx-ssl.conf voi domain cua ban:"
    echo "  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
    echo "  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
else
    echo ""
    echo "=== Loi! Khong the tao certificate ==="
    echo "Kiem tra lai domain va dam bao port 80 dang mo"
fi
