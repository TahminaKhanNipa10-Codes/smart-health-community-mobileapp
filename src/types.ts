export interface Medicine {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string; // 'Daily', 'Weekly', 'Monthly', etc.
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: any;
}

export interface Vaccination {
  id: string;
  userId: string;
  name: string;
  doseNumber: string; // '1st Dose', '2nd Dose', 'Booster', etc.
  dateTaken: string; // YYYY-MM-DD
  nextDoseDate?: string; // YYYY-MM-DD
  hospital: string;
  createdAt: any;
}
