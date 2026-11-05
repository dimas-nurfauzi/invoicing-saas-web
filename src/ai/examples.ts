/** Sample requests for the demo. Customer names are filled in from the workspace. */
export function exampleRequest(customerName = 'PT Contoh'): string {
  return [
    `Tolong buatkan invoice untuk ${customerName}:`,
    '- Desain ulang website, 1 paket, Rp 7.500.000',
    '- Maintenance bulanan 3 bulan @ Rp 1.250.000, diskon 10%',
    'Semua kena PPN 11%. Jatuh tempo 14 hari. Catatan: transfer ke BCA 1234567890.',
  ].join('\n')
}
