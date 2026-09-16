export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}

export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return '';
  // e.g. LHC-2026-000001 -> LHC-2026-****01
  const parts = cardNumber.split('-');
  if (parts.length === 3) {
    const num = parts[2];
    const masked = '****' + num.slice(-2);
    return `${parts[0]}-${parts[1]}-${masked}`;
  }
  return cardNumber;
}

export function maskPatientId(patientId: string): string {
  if (!patientId) return '';
  const parts = patientId.split('-');
  if (parts.length === 3) {
    const num = parts[2];
    const masked = '****' + num.slice(-2);
    return `${parts[0]}-${parts[1]}-${masked}`;
  }
  return patientId;
}

export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Converts a numeric amount into standard Indian currency words
 * e.g. 500 -> "Rupees Five Hundred Only"
 * e.g. 12500.50 -> "Rupees Twelve Thousand Five Hundred and Fifty Paise Only"
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rupees Zero Only';

  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  if (rounded === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    const ten = Math.floor(num / 10);
    const rest = num % 10;
    return `${tens[ten]}${rest > 0 ? ' ' + ones[rest] : ''}`;
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = '';
    if (hundred > 0) {
      res += `${ones[hundred]} Hundred`;
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const integerPart = Math.floor(Math.abs(rounded));
  const decimalPart = Math.round((Math.abs(rounded) - integerPart) * 100);

  const crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  const hundred = remainder % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertThreeDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (hundred > 0) {
    parts.push(convertThreeDigits(hundred));
  }

  let words = parts.join(' ').trim();
  if (!words) words = 'Zero';

  let result = `Rupees ${words}`;

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }

  return `${result} Only`;
}