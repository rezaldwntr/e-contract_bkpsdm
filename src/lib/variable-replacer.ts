import { Employee, ContractTemplate } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface DateInfo {
    startDate: Date;
    endDate: Date;
}

const numberToWords = (num: number): string => {
    if (num === 1) return 'satu';
    if (num === 5) return 'lima';
    return String(num);
};

export function replacePlaceholders(text: string, employee: Employee, dates: DateInfo): string {
    if (!text) return '';

    const contractDurationYears = employee.contractType === 'PENUH_WAKTU' ? 5 : 1;

    const replacements: { [key: string]: string } = {
        '{{NAMA_LENGKAP}}': employee.fullName,
        '{{NI_PPPK}}': employee.niPppk,
        '{{NIK}}': employee.nik,
        '{{JABATAN}}': employee.position,
        '{{UNIT_KERJA}}': employee.unitName,
        '{{TEMPAT_LAHIR}}': employee.birthPlace,
        '{{TANGGAL_LAHIR}}': format(parseISO(employee.birthDate), 'dd MMMM yyyy', { locale: id }),
        '{{PENDIDIKAN}}': employee.education,
        '{{ALAMAT}}': employee.address,
        '{{GAJI_ANGKA}}': employee.salaryNumeric.toLocaleString('id-ID'),
        '{{GAJI_TERBILANG}}': employee.salaryWords,
        '{{MASA_KONTRAK_TAHUN}}': String(contractDurationYears),
        '{{MASA_KONTRAK_TERBILANG}}': numberToWords(contractDurationYears),
        '{{TANGGAL_MULAI_KONTRAK}}': format(dates.startDate, 'dd MMMM yyyy', { locale: id }),
        '{{TANGGAL_SELESAI_KONTRAK}}': format(dates.endDate, 'dd MMMM yyyy', { locale: id }),
        '{{HARI_INI_LONG}}': format(dates.startDate, "eeee, dd MMMM yyyy", { locale: id }),
    };

    let result = text;
    for (const key in replacements) {
        // Use a global regex to replace all occurrences
        result = result.replace(new RegExp(key, 'g'), replacements[key]);
    }
    
    return result;
}
