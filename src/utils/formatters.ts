// Convert English digits to Persian digits
export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n
    .toString()
    .replace(/\d/g, (char) => persianDigits[parseInt(char, 10)]);
}

// Format price with comma separation and Toman unit
export function formatPrice(price: number): string {
  const formatted = price.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

// Format price without unit
export function formatNumberPersian(num: number): string {
  return toPersianDigits(num.toLocaleString('en-US'));
}

// Generate an order summary message for WhatsApp or copy
export function generateOrderText(
  items: { item: { name: string; price: number }; quantity: number }[],
  tableNumber: string,
  customerNote: string
): string {
  const total = items.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  
  let text = `📋 سفارش منوی رستوران\n`;
  if (tableNumber) {
    text += `📍 شماره میز: ${toPersianDigits(tableNumber)}\n`;
  }
  text += `--------------------------\n`;
  
  items.forEach((entry, idx) => {
    text += `${toPersianDigits(idx + 1)}. ${entry.item.name} × ${toPersianDigits(entry.quantity)} = ${formatPrice(entry.item.price * entry.quantity)}\n`;
  });
  
  text += `--------------------------\n`;
  text += `💰 مجموع کل: ${formatPrice(total)}\n`;
  
  if (customerNote.trim()) {
    text += `📝 توضیحات: ${customerNote.trim()}\n`;
  }
  
  return text;
}
