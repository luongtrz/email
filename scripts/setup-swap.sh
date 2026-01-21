#!/bin/bash

# Script tao Swap RAM (RAM ao) tu o cung
# Khuyen nghi: 2GB hoac 4GB tuy vao dung luong o cung con trong

SWAP_SIZE="${1:-2G}"  # Mac dinh la 2GB neu khong truyen tham so
SWAP_FILE="/swapfile"

echo "=== Bat dau tao Swap RAM: $SWAP_SIZE ==="

# 1. Kiem tra xem da co swap chua
if swapon --show | grep -q "$SWAP_FILE"; then
    echo "Swap file $SWAP_FILE da ton tai va dang hoat dong."
    exit 0
fi

# 2. Tao file swap
echo "-> Dang tao file swap..."
fallocate -l $SWAP_SIZE $SWAP_FILE
if [ $? -ne 0 ]; then
    echo "fallocate that bai, thu dung dd..."
    dd if=/dev/zero of=$SWAP_FILE bs=1024 count=$(echo $SWAP_SIZE | sed 's/G/000000/')
fi

# 3. Phan quyen (chi root duoc doc ghi)
echo "-> Dang set quyen..."
chmod 600 $SWAP_FILE

# 4. Format thanh swap
echo "-> Dang format swap..."
mkswap $SWAP_FILE

# 5. Kich hoat swap
echo "-> Dang kich hoat swap..."
swapon $SWAP_FILE

# 6. Luu cau hinh vao fstab de tu dong chay khi khoi dong lai
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "-> Dang luu vao /etc/fstab..."
    echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
else
    echo "-> Da co trong /etc/fstab"
fi

# 7. Kiem tra ket qua
echo ""
echo "=== Thanh cong! Trang thai RAM hien tai: ==="
free -h
echo ""
echo "Note: De xoa swap, chay: swapoff $SWAP_FILE && rm $SWAP_FILE && (xoa dong tuong ung trong /etc/fstab)"
