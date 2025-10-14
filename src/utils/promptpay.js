// src/utils/promptpay.js
// Utility to generate PromptPay payload for QR code


// EMVCo TLV builder
function tlv(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return id + len + value;
}

function formatPhone(phone) {
  let digits = phone.replace(/\D/g, '');
  // ถ้าเบอร์ขึ้นต้นด้วย 0 และมี 10 หลัก ให้แปลงเป็น 668XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = '66' + digits.slice(1);
  }
  // ถ้าเบอร์ขึ้นต้นด้วย 66 และมี 11 หลัก ให้เติม 8 ข้างหลัง 66
  if (digits.length === 11 && digits.startsWith('66')) {
    digits = '668' + digits.slice(2);
  }
  // ถ้าเบอร์ขึ้นต้นด้วย 668 และมี 12 หลัก ให้เติม 8 ข้างหลัง 66
  if (digits.length === 12 && digits.startsWith('668')) {
    // ถูกต้องแล้ว
    return digits;
  }
  // ถ้าเบอร์ขึ้นต้นด้วย 8 และมี 9 หลัก ให้เติม 668 ข้างหน้า
  if (digits.length === 9 && digits.startsWith('8')) {
    digits = '668' + digits;
  }
  return digits;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}


function generatePromptPayPayload(phone, amount) {
  // EMVCo tags
  const payloadFormat = tlv('00', '01');
  const pointOfInitiation = tlv('01', '12');
  // Merchant Account Info (PromptPay) - tag 29
  const guid = tlv('00', 'A000000677010111');
  // เบอร์ต้อง 13 หลัก (เช่น 668XXXXXXXXX)
  let mobile = formatPhone(phone);
  if (mobile.length === 12) mobile = '6' + mobile; // เผื่อ format ผิด
  const mobileTag = tlv('01', mobile);
  const merchantAccount = tlv('29', guid + mobileTag);
  // Transaction currency (764 = THB)
  const currency = tlv('53', '764');
  // Country code
  const country = tlv('58', 'TH');
  // Amount (optional)
  let amountTag = '';
  if (amount) {
    amountTag = tlv('54', Number(amount).toFixed(2));
  }
  // Assemble all tags
  let payload = payloadFormat + pointOfInitiation + merchantAccount + currency + country + amountTag;
  // CRC placeholder
  payload += '6304';
  // Calculate CRC
  const crc = crc16(payload);
  return payload + crc;
}

module.exports = { generatePromptPayPayload };
