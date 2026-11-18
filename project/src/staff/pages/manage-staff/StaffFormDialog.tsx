import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ImagePlus, KeyRound, Pencil, RotateCcw, UserPlus } from 'lucide-react';
import { Modal } from '@/staff/components/Modal';
import { useToast } from '@/staff/components/Toast';
import { FormSection, Button, Card, Input } from '@/staff/components/ui';
import { SelectField, TextAreaField, TextField } from '@/staff/components/FormFields';
import { EMPLOYMENT_TYPES, GENDERS, STAFF_DEPARTMENTS, STAFF_DESIGNATIONS } from '@/staff/config/options';
import { staffService } from '@/staff/services/staffService';
import { FALLBACK_COUNTRIES, FALLBACK_STATES, fetchCities, fetchCountries, fetchStates, type LookupOption } from '@/staff/services/commonLookupService';
import type { Staff } from '@/staff/types';
import { errorMessage, todayIso } from '@/staff/utils/format';

const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST'];
const STAFF_TYPE_OPTIONS = ['Teaching', 'Non-Teaching'];
const ROLE_OPTIONS = ['Staff', 'Teacher', 'Accountant', 'Coordinator'];
const BRANCH_OPTIONS = ['NAGPUR'];
const SUBJECT_OPTIONS = ['Mathematics', 'Physics', 'Chemistry', 'English'];
const BATCH_OPTIONS = ['Morning', 'Afternoon', 'Evening'];
const STEPS = ['Registration Details', 'Personal Details', 'Working & Educational', 'Login Details', 'Branch Access'];

const EMPTY_VALUES: Omit<Staff, 'id'> = {
  staffCode: '',
  name: '',
  gender: '',
  dateOfBirth: '',
  mobile: '',
  email: '',
  address: '',
  designation: '',
  department: '',
  employmentType: 'Full-time',
  joiningDate: todayIso(),
  biometricId: '',
  status: 'Active',
  notes: '',
  clearDate: '',
  usedLastEmployeeNumbers: '',
  workingHours: '',
  employeeNumber: '',
  manualEmployeeNumber: false,
  staffType: 'Teaching',
  firstName: '',
  middleName: '',
  lastName: '',
  correspondenceAddress: '',
  country: 'India',
  state: 'Maharashtra',
  city: 'Nagpur',
  pinCode: '',
  sameAsAbove: false,
  permanentAddress: '',
  permanentCountry: 'India',
  permanentState: 'Maharashtra',
  permanentCity: 'Nagpur',
  permanentPinCode: '',
  phone: '',
  category: '',
  photoUrl: '',
  yearsExperience: '',
  lastEmployer: '',
  education: '',
  homeBranch: 'NAGPUR',
  subjects: [],
  batches: [],
  createLogin: false,
  role: '',
  userId: '',
  moreBranchesAccess: false,
  branchAccess: [],
};

type StaffValues = Omit<Staff, 'id'>;
type ErrorKey = keyof StaffValues | 'password' | 'retypePassword';
type StaffErrors = Partial<Record<ErrorKey, string>>;
type FormMode = 'wizard' | 'full';

interface StaffFormDialogProps {
  staff: Staff | null;
  onClose: () => void;
  onSaved: () => void;
}

function splitName(name: string): { firstName: string; middleName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

function buildValues(staff: Staff | null): StaffValues {
  if (!staff) return { ...EMPTY_VALUES };
  const names = splitName(staff.name);
  const saved = Object.fromEntries(Object.entries(staff).filter(([key]) => key !== 'id')) as StaffValues;
  return {
    ...EMPTY_VALUES,
    ...saved,
    firstName: staff.firstName ?? names.firstName,
    middleName: staff.middleName ?? names.middleName,
    lastName: staff.lastName ?? names.lastName,
    correspondenceAddress: staff.correspondenceAddress ?? staff.address,
    permanentAddress: staff.permanentAddress ?? staff.address,
    country: staff.country ?? 'India',
    state: staff.state ?? 'Maharashtra',
    city: staff.city ?? 'Nagpur',
    permanentCountry: staff.permanentCountry ?? staff.country ?? 'India',
    permanentState: staff.permanentState ?? staff.state ?? 'Maharashtra',
    permanentCity: staff.permanentCity ?? staff.city ?? 'Nagpur',
    subjects: staff.subjects ?? [],
    batches: staff.batches ?? [],
    branchAccess: staff.branchAccess ?? [],
  };
}

export function StaffFormDialog({ staff, onClose, onSaved }: StaffFormDialogProps) {
  const { notify } = useToast();
  const [values, setValues] = useState<StaffValues>(() => buildValues(staff));
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [errors, setErrors] = useState<StaffErrors>({});
  const [saving, setSaving] = useState(false);
  const [checkingUserId, setCheckingUserId] = useState(false);
  const [availability, setAvailability] = useState<'available' | 'taken' | undefined>();
  const [mode, setMode] = useState<FormMode>('wizard');
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState<LookupOption[]>(FALLBACK_COUNTRIES);
  const [states, setStates] = useState<LookupOption[]>(FALLBACK_STATES);
  const [cities, setCities] = useState<LookupOption[]>([]);
  const isEdit = staff !== null;

  const optionNames = (options: LookupOption[]) => options.map((option) => option.name);

  useEffect(() => {
    let active = true;
    fetchCountries().then((result) => {
      if (active) setCountries(result);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const match = countries.find((option) => option.name === values.country);
    fetchStates(match ? match.id : countries[0]?.id ?? 0).then((result) => {
      if (active) setStates(result);
    });
    return () => { active = false; };
  }, [values.country, countries]);

  useEffect(() => {
    let active = true;
    const match = states.find((option) => option.name === values.state);
    fetchCities(match ? match.id : states[0]?.id ?? 0).then((result) => {
      if (active) setCities(result);
    });
    return () => { active = false; };
  }, [values.state, states]);

  const setValue = <K extends keyof StaffValues>(key: K, value: StaffValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    if (key === 'userId') setAvailability(undefined);
  };

  const updateName = (key: 'firstName' | 'middleName' | 'lastName', value: string) => {
    setValues((previous) => {
      const next = { ...previous, [key]: value };
      next.name = [next.firstName, next.middleName, next.lastName].filter(Boolean).join(' ');
      return next;
    });
    setErrors((previous) => ({ ...previous, [key]: undefined, name: undefined }));
  };

  const updateCorrespondence = (key: 'correspondenceAddress' | 'country' | 'state' | 'city' | 'pinCode', value: string) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
      ...(previous.sameAsAbove
        ? {
            permanentAddress: key === 'correspondenceAddress' ? value : previous.permanentAddress,
            permanentCountry: key === 'country' ? value : previous.permanentCountry,
            permanentState: key === 'state' ? value : previous.permanentState,
            permanentCity: key === 'city' ? value : previous.permanentCity,
            permanentPinCode: key === 'pinCode' ? value : previous.permanentPinCode,
          }
        : {}),
    }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const toggleListValue = (key: 'subjects' | 'batches' | 'branchAccess', value: string) => {
    const current = values[key] ?? [];
    setValue(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const validateStep = (currentStep: number): StaffErrors => {
    const found: StaffErrors = {};
    if (currentStep === 0) {
      if (!values.staffCode.trim()) found.staffCode = 'Enter an employee code.';
      if (!values.joiningDate) found.joiningDate = 'Select a joining date.';
    }
    if (currentStep === 1) {
      if (!values.name.trim()) found.name = 'Enter the staff member name.';
      if (!values.mobile.trim()) found.mobile = 'Enter a mobile number.';
      if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) found.email = 'Enter a valid email address.';
    }
    if (currentStep === 2) {
      if (!values.designation) found.designation = 'Select a designation.';
      if (!values.department) found.department = 'Select a department.';
      if (!values.employmentType) found.employmentType = 'Select an employment type.';
    }
    if (currentStep === 3 && values.createLogin) {
      if (!values.role) found.role = 'Select a role.';
      if (!values.userId?.trim()) found.userId = 'Enter a user ID.';
      if (!password) found.password = 'Enter a password.';
      if (password !== retypePassword) found.retypePassword = 'Passwords do not match.';
    }
    return found;
  };

  const validateAll = (): StaffErrors => {
    return STEPS.reduce<StaffErrors>((result, _, index) => ({ ...result, ...validateStep(index) }), {});
  };

  const submit = async () => {
    const found = validateAll();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (mode === 'wizard') {
        const firstErrorStep = STEPS.findIndex((_, index) => Object.keys(validateStep(index)).length > 0);
        if (firstErrorStep >= 0) setStep(firstErrorStep);
      }
      return;
    }

    setSaving(true);
    try {
      const persistedValues: StaffValues = {
        ...values,
        address: values.correspondenceAddress ?? values.address,
      };
      if (staff) {
        await staffService.updateStaff({ ...persistedValues, id: staff.id });
      } else {
        await staffService.createStaff(persistedValues);
      }
      notify(isEdit ? 'Staff details updated.' : 'Staff member added.');
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setValues(buildValues(staff));
    setPassword('');
    setRetypePassword('');
    setErrors({});
    setAvailability(undefined);
    setStep(0);
  };

  const checkAvailability = async () => {
    const userId = values.userId?.trim();
    if (!userId) {
      setErrors((previous) => ({ ...previous, userId: 'Enter a user ID first.' }));
      return;
    }
    setCheckingUserId(true);
    try {
      const staffRows = await staffService.listStaff();
      const taken = staffRows.some((member) => member.id !== staff?.id && member.userId?.toLowerCase() === userId.toLowerCase());
      setAvailability(taken ? 'taken' : 'available');
      notify(taken ? 'That user ID is already used in this preview.' : 'That user ID is available in this preview.', taken ? 'error' : 'success');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setCheckingUserId(false);
    }
  };

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setValue('photoUrl', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const renderRegistration = () => (
    <FormSection title="Registration Details">
      <TextField id="staff-joining" label="Joining date" type="date" required value={values.joiningDate} error={errors.joiningDate} onChange={(value) => setValue('joiningDate', value)} />
      <TextField id="staff-clear" label="Clear date" type="date" value={values.clearDate ?? ''} onChange={(value) => setValue('clearDate', value)} />
      <TextField id="staff-used-numbers" label="Used last employee numbers" value={values.usedLastEmployeeNumbers ?? ''} onChange={(value) => setValue('usedLastEmployeeNumbers', value)} hint="Leave blank when the number is assigned by the institute process." />
      <TextField id="staff-biometric" label="Biometric attendance ID" value={values.biometricId} onChange={(value) => setValue('biometricId', value)} />
      <TextField id="staff-hours" label="No. of working hours" type="number" min="0" step="0.5" value={values.workingHours ?? ''} onChange={(value) => setValue('workingHours', value)} />
      <TextField id="staff-code" label="Employee no." required value={values.staffCode} error={errors.staffCode} onChange={(value) => setValue('staffCode', value)} />
      <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
        <input type="checkbox" checked={Boolean(values.manualEmployeeNumber)} onChange={(event) => setValue('manualEmployeeNumber', event.target.checked)} className="h-4 w-4 rounded border-border accent-primary-600" />
        Enter manual employee no.
      </label>
      {values.manualEmployeeNumber && <TextField id="staff-employee-number" label="Manual employee no." value={values.employeeNumber ?? ''} onChange={(value) => setValue('employeeNumber', value)} />}
    </FormSection>
  );

  const renderPersonal = () => (
    <FormSection title="Personal Details">
      <SelectField id="staff-type" label="Staff type" required options={STAFF_TYPE_OPTIONS} value={values.staffType ?? ''} onChange={(value) => setValue('staffType', value)} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Name</span>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input aria-label="First name" placeholder="First name" value={values.firstName ?? ''} onChange={(event) => updateName('firstName', event.target.value)} />
          <Input aria-label="Middle name" placeholder="Middle name" value={values.middleName ?? ''} onChange={(event) => updateName('middleName', event.target.value)} />
          <Input aria-label="Last name" placeholder="Last name" value={values.lastName ?? ''} onChange={(event) => updateName('lastName', event.target.value)} />
        </div>
        {errors.name && <p role="alert" className="text-xs text-danger-600">{errors.name}</p>}
      </div>
      <TextAreaField id="staff-correspondence" label="Correspondence address" value={values.correspondenceAddress ?? ''} onChange={(value) => updateCorrespondence('correspondenceAddress', value)} className="md:col-span-2" placeholder="Enter the correspondence address" />
      <SelectField id="staff-country" label="Country" required options={optionNames(countries)} value={values.country ?? ''} onChange={(value) => updateCorrespondence('country', value)} />
      <SelectField id="staff-state" label="State" required options={optionNames(states)} value={values.state ?? ''} onChange={(value) => updateCorrespondence('state', value)} />
      <SelectField id="staff-city" label="City" required options={optionNames(cities.length > 0 ? cities : [values.city].filter(Boolean).map((name) => ({ id: 0, name: name as string })))} value={values.city ?? ''} onChange={(value) => updateCorrespondence('city', value)} />
      <TextField id="staff-pin" label="Pin code" value={values.pinCode ?? ''} onChange={(value) => updateCorrespondence('pinCode', value)} />
      <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(values.sameAsAbove)}
          onChange={(event) => {
            const checked = event.target.checked;
            setValues((previous) => ({
              ...previous,
              sameAsAbove: checked,
              ...(checked
                ? {
                    permanentAddress: previous.correspondenceAddress,
                    permanentCountry: previous.country,
                    permanentState: previous.state,
                    permanentCity: previous.city,
                    permanentPinCode: previous.pinCode,
                  }
                : {}),
            }));
          }}
          className="h-4 w-4 rounded border-border accent-primary-600"
        />
        Same as above
      </label>
      <TextAreaField id="staff-permanent" label="Permanent address" value={values.permanentAddress ?? ''} onChange={(value) => setValue('permanentAddress', value)} className="md:col-span-2" disabled={Boolean(values.sameAsAbove)} />
      <SelectField id="staff-permanent-country" label="Country" options={optionNames(countries)} value={values.permanentCountry ?? ''} onChange={(value) => setValue('permanentCountry', value)} />
      <SelectField id="staff-permanent-state" label="State" options={optionNames(states)} value={values.permanentState ?? ''} onChange={(value) => setValue('permanentState', value)} />
      <SelectField id="staff-permanent-city" label="City" options={optionNames(cities.length > 0 ? cities : [values.permanentCity].filter(Boolean).map((name) => ({ id: 0, name: name as string })))} value={values.permanentCity ?? ''} onChange={(value) => setValue('permanentCity', value)} />
      <TextField id="staff-permanent-pin" label="Pin code" value={values.permanentPinCode ?? ''} onChange={(value) => setValue('permanentPinCode', value)} />
      <TextField id="staff-phone" label="Phone" value={values.phone ?? ''} onChange={(value) => setValue('phone', value)} />
      <TextField id="staff-mobile" label="Mobile" required value={values.mobile} error={errors.mobile} onChange={(value) => setValue('mobile', value)} />
      <TextField id="staff-email" label="Email ID" type="email" value={values.email} error={errors.email} onChange={(value) => setValue('email', value)} />
      <SelectField id="staff-gender" label="Gender" placeholder="Select gender" options={GENDERS} value={values.gender} onChange={(value) => setValue('gender', value)} />
      <TextField id="staff-dob" label="Date of birth" type="date" value={values.dateOfBirth} onChange={(value) => setValue('dateOfBirth', value)} />
      <SelectField id="staff-category" label="Category" placeholder="Select category" options={CATEGORY_OPTIONS} value={values.category ?? ''} onChange={(value) => setValue('category', value)} />
      <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-4 md:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          {values.photoUrl ? <img src={values.photoUrl} alt="Staff preview" className="h-16 w-16 rounded-xl object-cover ring-2 ring-white shadow-sm" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-primary-500 shadow-sm"><ImagePlus className="h-6 w-6" aria-hidden /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Upload photo</p>
            <p className="mt-1 text-xs text-muted">Use a clear profile image. Preview images are stored locally.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-xs font-medium text-white transition-colors hover:bg-primary-700">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                Choose image
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handlePhoto(event.target.files?.[0])} />
              </label>
              {values.photoUrl && <Button variant="ghost" size="sm" onClick={() => setValue('photoUrl', '')}>Remove image</Button>}
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  );

  const renderWorking = () => (
    <FormSection title="Working & Educational Details">
      <TextField id="staff-experience" label="Years of experience" type="number" min="0" step="0.5" value={values.yearsExperience ?? ''} onChange={(value) => setValue('yearsExperience', value)} />
      <TextField id="staff-employer" label="Last employer" value={values.lastEmployer ?? ''} onChange={(value) => setValue('lastEmployer', value)} />
      <TextField id="staff-education" label="Education" value={values.education ?? ''} onChange={(value) => setValue('education', value)} />
      <SelectField id="staff-home-branch" label="Home branch" options={BRANCH_OPTIONS} value={values.homeBranch ?? ''} onChange={(value) => setValue('homeBranch', value)} />
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Subjects</p>
            <p className="text-xs text-muted">Preview choices only; live subject lookup is not available in the supplied source.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setValue('subjects', values.subjects?.length === SUBJECT_OPTIONS.length ? [] : [...SUBJECT_OPTIONS])}>
            {values.subjects?.length === SUBJECT_OPTIONS.length ? 'Clear all' : 'Select all'}
          </Button>
        </div>
        <div className="grid gap-2 rounded-xl border border-border bg-slate-50/70 p-3 sm:grid-cols-2">
          {SUBJECT_OPTIONS.map((subject) => (
            <label key={subject} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-ink shadow-sm">
              <input type="checkbox" checked={values.subjects?.includes(subject) ?? false} onChange={() => toggleListValue('subjects', subject)} className="h-4 w-4 rounded border-border accent-primary-600" />
              {subject}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2 md:col-span-2">
        <p className="text-[13px] font-medium text-ink">Batch</p>
        <div className="grid gap-2 rounded-xl border border-border bg-slate-50/70 p-3 sm:grid-cols-3">
          {BATCH_OPTIONS.map((batch) => (
            <label key={batch} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-ink shadow-sm">
              <input type="checkbox" checked={values.batches?.includes(batch) ?? false} onChange={() => toggleListValue('batches', batch)} className="h-4 w-4 rounded border-border accent-primary-600" />
              {batch}
            </label>
          ))}
        </div>
      </div>
      <SelectField id="staff-designation" label="Designation" required placeholder="Select designation" options={STAFF_DESIGNATIONS} value={values.designation} error={errors.designation} onChange={(value) => setValue('designation', value)} />
      <SelectField id="staff-department" label="Department" required placeholder="Select department" options={STAFF_DEPARTMENTS} value={values.department} error={errors.department} onChange={(value) => setValue('department', value)} />
      <SelectField id="staff-employment" label="Employment type" required options={EMPLOYMENT_TYPES} value={values.employmentType} error={errors.employmentType} onChange={(value) => setValue('employmentType', value)} />
      <TextAreaField id="staff-notes" label="Notes" className="md:col-span-2" maxLength={500} value={values.notes} onChange={(value) => setValue('notes', value)} placeholder="Add an internal note if needed" />
    </FormSection>
  );

  const renderLogin = () => (
    <FormSection title="Login Details">
      <label className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/60 p-4 md:col-span-2">
        <input type="checkbox" checked={Boolean(values.createLogin)} onChange={(event) => setValue('createLogin', event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary-600" />
        <span>
          <span className="block text-sm font-semibold text-ink">Create LoginId & Password</span>
          <span className="mt-1 block text-xs text-muted">Credentials are used only for this preview form and passwords are never saved in the staff record.</span>
        </span>
      </label>
      <SelectField id="staff-role" label="Role" required={Boolean(values.createLogin)} options={ROLE_OPTIONS} placeholder="Select role" value={values.role ?? ''} error={errors.role} onChange={(value) => setValue('role', value)} />
      <div className="flex items-end gap-2">
        <TextField id="staff-user-id" label="User ID" required={Boolean(values.createLogin)} value={values.userId ?? ''} error={errors.userId} onChange={(value) => setValue('userId', value)} />
        <Button variant="secondary" size="sm" onClick={checkAvailability} loading={checkingUserId} className="mb-0.5 shrink-0">Check availability</Button>
      </div>
      {availability && <p className={`text-xs md:col-span-2 ${availability === 'available' ? 'text-success-700' : 'text-danger-600'}`}>{availability === 'available' ? 'User ID is available in this preview.' : 'User ID is already used in this preview.'}</p>}
      <TextField id="staff-password" label="Password" type="password" required={Boolean(values.createLogin)} value={password} error={errors.password} onChange={setPassword} />
      <TextField id="staff-retype-password" label="Re-type password" type="password" required={Boolean(values.createLogin)} value={retypePassword} error={errors.retypePassword} onChange={setRetypePassword} />
    </FormSection>
  );

  const renderBranches = () => (
    <FormSection title="More Branches To Access">
      <label className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/70 p-4 md:col-span-2">
        <input type="checkbox" checked={Boolean(values.moreBranchesAccess)} onChange={(event) => setValue('moreBranchesAccess', event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary-600" />
        <span>
          <span className="block text-sm font-semibold text-ink">Allow access to more branches</span>
          <span className="mt-1 block text-xs text-muted">Branch permissions are retained in this preview record; live permission enforcement is not available in the supplied source.</span>
        </span>
      </label>
      {values.moreBranchesAccess && (
        <div className="grid gap-2 sm:grid-cols-2 md:col-span-2">
          {BRANCH_OPTIONS.map((branch) => (
            <label key={branch} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink">
              <input type="checkbox" checked={values.branchAccess?.includes(branch) ?? false} onChange={() => toggleListValue('branchAccess', branch)} className="h-4 w-4 rounded border-border accent-primary-600" />
              {branch}
            </label>
          ))}
        </div>
      )}
    </FormSection>
  );

  const renderStep = (currentStep: number) => [renderRegistration(), renderPersonal(), renderWorking(), renderLogin(), renderBranches()][currentStep];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Edit Staff Registration' : 'Staff Registration'}
      description={isEdit ? `Update the registration record for ${staff.name}.` : 'Complete the original registration sections without leaving this workflow.'}
      icon={isEdit ? <Pencil className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={resetForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Clear
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            {mode === 'wizard' && step > 0 && <Button variant="outline" onClick={() => setStep((current) => current - 1)} disabled={saving}><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Button>}
            {mode === 'wizard' && step < STEPS.length - 1 && <Button onClick={() => { const found = validateStep(step); setErrors(found); if (Object.keys(found).length === 0) setStep((current) => current + 1); }} disabled={saving}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>}
            {(mode === 'full' || step === STEPS.length - 1) && <Button onClick={submit} loading={saving}><Check className="h-4 w-4" aria-hidden />{isEdit ? 'Update staff' : 'Save staff'}</Button>}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/80 p-2">
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setMode('wizard')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === 'wizard' ? 'bg-white text-primary-700 shadow-sm' : 'text-muted hover:text-ink'}`}>Wizard Form</button>
            <button type="button" onClick={() => setMode('full')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === 'full' ? 'bg-white text-primary-700 shadow-sm' : 'text-muted hover:text-ink'}`}>Full Form</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted"><KeyRound className="h-3.5 w-3.5 text-primary-600" aria-hidden /> All fields remain in the same form state</div>
        </div>

        {mode === 'wizard' ? (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-5">
              {STEPS.map((label, index) => (
                <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={`rounded-xl border px-3 py-3 text-left transition-colors ${index === step ? 'border-primary-300 bg-primary-50 text-primary-700' : index < step ? 'border-success-600/30 bg-success-50 text-success-700' : 'border-border bg-white text-muted'}`}>
                  <span className="flex items-center gap-2 text-xs font-semibold"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] ring-1 ring-inset ring-current">{index < step ? <Check className="h-3 w-3" aria-hidden /> : index + 1}</span>{label}</span>
                </button>
              ))}
            </div>
            <Card title={STEPS[step]} description={`Step ${step + 1} of ${STEPS.length}`} bodyClassName="p-4 sm:p-6">
              {renderStep(step)}
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {renderRegistration()}
            {renderPersonal()}
            {renderWorking()}
            {renderLogin()}
            {renderBranches()}
          </div>
        )}
      </div>
    </Modal>
  );
}
