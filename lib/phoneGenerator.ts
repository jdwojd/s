import { PhoneCountry } from './phoneCountries';

function secureRandom(min: number, max: number): number {
  const range = max - min + 1;
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return min + (randomBuffer[0] % range);
}

function randomChoice<T>(array: T[]): T {
  return array[secureRandom(0, array.length - 1)];
}

function randomDigit(): string {
  return secureRandom(0, 9).toString();
}

export function generatePhoneNumber(country: PhoneCountry): string {
  const prefix = randomChoice(country.prefixes);
  const remainingLength = country.length - prefix.length;

  let number = prefix;
  for (let i = 0; i < remainingLength; i++) {
    number += randomDigit();
  }

  let formatted = country.format;
  for (const char of number) {
    formatted = formatted.replace('X', char);
  }

  return `${country.dialCode} ${formatted}`;
}

export function generatePhoneNumbers(country: PhoneCountry, count: number): string[] {
  const numbers: string[] = [];
  for (let i = 0; i < count; i++) {
    numbers.push(generatePhoneNumber(country));
  }
  return numbers;
}

export function downloadPhoneNumbers(numbers: string[], filename: string = 'phone_numbers.txt'): void {
  const content = numbers.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
