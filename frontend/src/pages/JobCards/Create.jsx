import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { checkVehicle, checkCustomer, listVehicleCompanies, createVehicleCompany, listVehicleModels, createVehicleModel, listVehicleColours, createVehicleColour } from '../../api/customers';
import { createFullJobCard, getCustomerTiers } from '../../api/jobcards';
import { listServices } from '../../api/services';
import { getSettings } from '../../api/settings';
import { extractError } from '../../api/axios';
import { listEmployees } from '../../api/employees';
import VehicleAutocomplete from '../../components/VehicleAutocomplete';

const nowLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const VEHICLE_TYPES = [
  { value: 'two_wheeler', label: 'Two Wheeler' },
  { value: 'three_wheeler', label: 'Three Wheeler' },
  { value: 'four_wheeler', label: 'Four Wheeler' },
  { value: 'other', label: 'Other' },
];

/* Four-wheeler sub-types — all use the four-wheeler image */
const FOUR_WHEELER_SUB_TYPES = [
  { value: 'sedan',       label: 'Sedan',       description: 'Saloon car' },
  { value: 'compact_suv', label: 'Compact SUV',  description: 'Compact SUV' },
  { value: 'suv',         label: 'SUV',          description: 'Full-size SUV' },
  { value: 'hatchback',   label: 'Hatchback',    description: 'Hatchback car' },
  { value: 'others',      label: 'Others',       description: 'Other 4-wheelers' },
];

/* ─── Local image paths ────────────────────────────────────────────────────── */
const VEHICLE_TYPE_OPTIONS = [
  {
    value: 'two_wheeler',
    label: 'Two Wheeler',
    description: 'Bike / Scooter',
    img: '/images/two-wheeler.jpg',
    fallback: '#2d1b69',
    accent: '#a78bfa',
  },
  {
    value: 'three_wheeler',
    label: 'Three Wheeler',
    description: 'Auto Rickshaw',
    img: '/images/three-wheeler.jpg',
    fallback: '#78350f',
    accent: '#fbbf24',
  },
  {
    value: 'four_wheeler',
    label: 'Four Wheeler',
    description: 'Car / SUV',
    img: '/images/four-wheeler.jpg',
    fallback: '#0c4a6e',
    accent: '#38bdf8',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Heavy / Commercial',
    img: '/images/other-vehicle.jpg',
    fallback: '#1a2e05',
    accent: '#86efac',
  },
];

/* ─── Determine effective pricing key from vehicle type + sub-type ─────── */
function getEffectivePricingType(vehicleType, vehicleSubType) {
  if (vehicleType === 'two_wheeler') return 'two_wheeler';
  if (vehicleType === 'four_wheeler' && vehicleSubType) return vehicleSubType;
  return null; // three_wheeler, other → no specific pricing
}

/* ─── Pick the right price for a service given the effective pricing type ── */
function getServicePrice(service, effectivePricingType) {
  if (effectivePricingType && (service.vehicle_prices || []).length > 0) {
    const vp = service.vehicle_prices.find(p => p.vehicle_type === effectivePricingType);
    if (vp) return Number(vp.price);
  }
  return Number(service.service_price || 0);
}

/* ─── Filter services: only show those relevant to the selected vehicle type ─
   Rule:
     - If service has NO vehicle_prices → always show (use default price)
     - If service has vehicle_prices but not for effectivePricingType → hide
     - If effectivePricingType is null → show all                              */
function filterServicesForVehicle(services, effectivePricingType) {
  if (!effectivePricingType) return services;
  return services.filter(s => {
    const vps = s.vehicle_prices || [];
    if (vps.length === 0) return true;
    return vps.some(vp => vp.vehicle_type === effectivePricingType);
  });
}

/* ─── VehicleTypePicker ───────────────────────────────────────────────────── */
function VehicleTypePicker({ value, onChange, error }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {VEHICLE_TYPE_OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-200 group
                focus:outline-none focus:ring-2 focus:ring-accent/40
                ${selected
                  ? 'border-accent shadow-[0_0_0_1px_rgba(124,92,255,0.4),0_6px_20px_rgba(124,92,255,0.25)] scale-[1.02]'
                  : 'border-border hover:border-gray-500 hover:scale-[1.01]'
                }
              `}
              style={{ aspectRatio: '3/2' }}
            >
              <div className="absolute inset-0" style={{ background: opt.fallback }} />
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${opt.img})` }}
              />
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: selected
                    ? `linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.3) 100%)`
                    : `linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 100%)`,
                }}
              />
              {selected && (
                <div
                  className="absolute inset-0 opacity-25"
                  style={{ background: `radial-gradient(ellipse at bottom, ${opt.accent} 0%, transparent 70%)` }}
                />
              )}
              {selected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: opt.accent }}
                >
                  <Check size={11} className="text-black font-bold" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-2.5">
                <div className="text-xs font-bold text-white leading-tight">{opt.label}</div>
                <div className="text-[10px] text-white/60 mt-0.5">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ─── FourWheelerSubTypePicker ────────────────────────────────────────────── */
function FourWheelerSubTypePicker({ value, onChange, error }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {FOUR_WHEELER_SUB_TYPES.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-200 group
                focus:outline-none focus:ring-2 focus:ring-accent/40
                ${selected
                  ? 'border-accent shadow-[0_0_0_1px_rgba(124,92,255,0.4),0_6px_20px_rgba(124,92,255,0.25)] scale-[1.02]'
                  : 'border-border hover:border-gray-500 hover:scale-[1.01]'
                }
              `}
              style={{ aspectRatio: '3/2' }}
            >
              {/* Gradient fallback */}
              <div className="absolute inset-0" style={{ background: '#0c4a6e' }} />
              {/* All sub-types use the four-wheeler image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: 'url(/images/four-wheeler.jpg)' }}
              />
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: selected
                    ? `linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.3) 100%)`
                    : `linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 100%)`,
                }}
              />
              {selected && (
                <div
                  className="absolute inset-0 opacity-25"
                  style={{ background: 'radial-gradient(ellipse at bottom, #38bdf8 0%, transparent 70%)' }}
                />
              )}
              {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-sky-400">
                  <Check size={11} className="text-black font-bold" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-2.5">
                <div className="text-xs font-bold text-white leading-tight">{opt.label}</div>
                <div className="text-[10px] text-white/60 mt-0.5">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function JobCardCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [vehicleMatch, setVehicleMatch] = useState(null);
  const [customerMatch, setCustomerMatch] = useState(null);
  const [jobCard, setJobCard] = useState({
    job_card_date: new Date().toISOString().slice(0, 10),
    vehicle_number: '',
    vehicle_kilometers: '',
    vehicle_entry_time: nowLocal(),
    vehicle_expected_exit_time: '',
    complaints: '',
    phone_number: '',
    employee: '',
  });

  const [customer, setCustomer] = useState({ customer_name: '', email: '' });

  const [vehicle, setVehicle] = useState({
    vehicle_name: '',
    vehicle_company: '',
    vehicle_model: '',
    vehicle_colour: '',
    vehicle_type: 'four_wheeler',
  });

  /* Four-wheeler sub-type (sedan / compact_suv / suv / hatchback / others) */
  const [vehicleSubType, setVehicleSubType] = useState('');

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [gstPercent, setGstPercent] = useState('18');
  const [employees, setEmployees] = useState([]);
  const [tiers, setTiers] = useState({ high_value: [], frequent: [] });
  const [matchedTier, setMatchedTier] = useState(null);

  useEffect(() => {
    getSettings()
      .then(data => {
        const s = data.find(d => d.field_name === 'default_gst_percent');
        if (s?.value) setGstPercent(s.value);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listEmployees()
      .then(data => setEmployees(Array.isArray(data) ? data : (data.results || [])))
      .catch(err => toast.error(extractError(err)));
    getCustomerTiers().then(setTiers).catch(() => {});
  }, []); // eslint-disable-line

  const updateJobCard = (k, v) => setJobCard((f) => ({ ...f, [k]: v }));
  const updateCustomer = (k, v) => setCustomer((f) => ({ ...f, [k]: v }));
  const updateVehicle = (k, v) => setVehicle((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (step !== 3 || services.length > 0) return;
    setLoadingServices(true);
    listServices()
      .then((d) => setServices(Array.isArray(d) ? d : (d.results || [])))
      .catch((err) => toast.error(extractError(err)))
      .finally(() => setLoadingServices(false));
    // eslint-disable-next-line
  }, [step]);

  /* Effective pricing type derived from current vehicle info */
  const effectivePricingType = vehicleMatch
    ? getEffectivePricingType(vehicleMatch.vehicle?.vehicle_type, vehicleSubType)
    : getEffectivePricingType(vehicle.vehicle_type, vehicleSubType);

  const validateStep1 = () => {
    const e = {};
    if (!jobCard.job_card_date) e.job_card_date = 'Required';
    if (!jobCard.vehicle_number.trim()) e.vehicle_number = 'Required';
    if (jobCard.vehicle_kilometers === '' || isNaN(Number(jobCard.vehicle_kilometers))) e.vehicle_kilometers = 'Required';
    if (!jobCard.vehicle_entry_time) e.vehicle_entry_time = 'Required';
    if (!jobCard.vehicle_expected_exit_time) e.vehicle_expected_exit_time = 'Required';
    if (!jobCard.phone_number.trim()) e.phone_number = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const currentVehicleType = vehicleMatch ? vehicleMatch.vehicle?.vehicle_type : vehicle.vehicle_type;

    if (!vehicleMatch) {
      if (!customerMatch && !customer.customer_name.trim()) e.customer_name = 'Required';
      if (!customerMatch && !customer.email.trim()) e.email = 'Required';
      if (!vehicle.vehicle_type) e.vehicle_type = 'Required';
    }

    if (currentVehicleType === 'four_wheeler' && !vehicleSubType) {
      e.vehicle_sub_type = 'Please select a vehicle sub-type';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resolveTier = (customerId) => {
    if (!customerId) return null;
    const hvEntry = tiers.high_value.find(t => t.id === customerId);
    if (hvEntry) return { type: 'H', label: 'High-Value Customer', value: `₹${Number(hvEntry.revenue).toLocaleString('en-IN')} total revenue` };
    const fqEntry = tiers.frequent.find(t => t.id === customerId);
    if (fqEntry) return { type: 'F', label: 'Frequent Visitor', value: `${fqEntry.visits} visit${fqEntry.visits !== 1 ? 's' : ''}` };
    return null;
  };

  const handleNextFromStep1 = async () => {
    if (!validateStep1()) return;
    setChecking(true);
    try {
      const result = await checkVehicle(jobCard.vehicle_number.trim());
      const customerResult = await checkCustomer(jobCard.phone_number.trim());
      if (result && result.exists) {
        setVehicleMatch({ customer: result.customer, vehicle: result.vehicle });
        setMatchedTier(resolveTier(result.customer?.id));
        /* For four-wheelers we still need sub-type selection → go to step 2 */
        if (result.vehicle?.vehicle_type === 'four_wheeler') {
          setCustomerMatch(null);
          setStep(2);
        } else {
          setStep(3);
        }
      } else if (customerResult && customerResult.exists) {
        setCustomerMatch({ customer: customerResult.customer });
        setMatchedTier(resolveTier(customerResult.customer?.id));
        setVehicleMatch(null);
        setStep(2);
      } else {
        setVehicleMatch(null);
        setCustomerMatch(null);
        setMatchedTier(null);
        setStep(2);
      }
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setChecking(false);
    }
  };

  const handleNextFromStep2 = () => {
    if (!validateStep2()) return;
    setStep(3);
  };

  const handleBackFromStep3 = () => {
    const currentVehicleType = vehicleMatch ? vehicleMatch.vehicle?.vehicle_type : vehicle.vehicle_type;
    /* Go back to step 1 only when vehicle was matched AND it's NOT a four-wheeler
       (four-wheelers need step 2 for sub-type selection) */
    if (vehicleMatch && currentVehicleType !== 'four_wheeler') {
      setStep(1);
    } else {
      setStep(2);
    }
  };

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* Services visible in step 3, filtered by vehicle type */
  const visibleServices = filterServicesForVehicle(services, effectivePricingType);

  const basePrice = visibleServices
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + getServicePrice(s, effectivePricingType), 0);
  const gstAmount = basePrice * Number(gstPercent || 0) / 100;
  const totalPrice = basePrice + gstAmount;

  const submit = async () => {
    if (selectedServiceIds.length === 0) {
      toast.error('Select at least one service');
      return;
    }
    setSubmitting(true);
    try {
      const currentVehicleType = vehicleMatch
        ? vehicleMatch.vehicle?.vehicle_type
        : vehicle.vehicle_type;

      const payload = {
        job_card: {
          job_card_date:             jobCard.job_card_date,
          vehicle_kilometers:        Number(jobCard.vehicle_kilometers),
          vehicle_entry_time:        new Date(jobCard.vehicle_entry_time).toISOString(),
          vehicle_expected_exit_time: new Date(jobCard.vehicle_expected_exit_time).toISOString(),
          complaints:                jobCard.complaints,
          gst_percent:               Number(gstPercent || 18),
          vehicle_sub_type:          currentVehicleType === 'four_wheeler' ? vehicleSubType : null,
          ...(jobCard.employee ? { employee: Number(jobCard.employee) } : {}),
        },
        customer: vehicleMatch
          ? {
              is_new: false,
              id: vehicleMatch.customer?.id ?? null,
              customer_name: vehicleMatch.customer?.customer_name ?? '',
              phone_number: vehicleMatch.customer?.phone_number ?? '',
              email: vehicleMatch.customer?.email ?? '',
            }
          : customerMatch
            ? {
                is_new: false,
                id: customerMatch.customer?.id ?? null,
                customer_name: customerMatch.customer?.customer_name ?? '',
                phone_number: customerMatch.customer?.phone_number ?? '',
                email: customerMatch.customer?.email ?? '',
              }
            : {
                is_new: true,
                id: null,
                customer_name: customer.customer_name.trim(),
                phone_number: jobCard.phone_number.trim(),
                email: customer.email.trim(),
              },
        vehicle: vehicleMatch
          ? {
              is_new: false,
              id: vehicleMatch.vehicle?.id ?? null,
              vehicle_number: vehicleMatch.vehicle?.vehicle_number ?? jobCard.vehicle_number.trim(),
              vehicle_name: vehicleMatch.vehicle?.vehicle_name ?? '',
              vehicle_type: vehicleMatch.vehicle?.vehicle_type ?? '',
            }
          : {
              is_new: true,
              id: null,
              vehicle_number: jobCard.vehicle_number.trim(),
              vehicle_name: vehicle.vehicle_name.trim(),
              vehicle_company: vehicle.vehicle_company.trim(),
              vehicle_model: vehicle.vehicle_model.trim(),
              vehicle_colour: vehicle.vehicle_colour.trim(),
              vehicle_type: vehicle.vehicle_type,
            },
        services: selectedServiceIds,
      };
      const created = await createFullJobCard(payload);
      toast.success('Job card created');
      navigate(`/jobcards/${created.id}`);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* Stepper: step 2 is "skipped" only when vehicleMatch exists and it's NOT a four-wheeler */
  const skippedCustomer = !!vehicleMatch && vehicleMatch.vehicle?.vehicle_type !== 'four_wheeler';

  return (
    <div>
      <PageHeader
        title="New Job Card"
        breadcrumbs={
          <Link to="/jobcards" className="hover:text-gray-300 inline-flex items-center gap-1">
            <ChevronLeft size={12} /> Back to Job Cards
          </Link>
        }
      />

      <Stepper step={step} skippedCustomer={skippedCustomer} />

      <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-6 max-w-3xl mt-4">
        {step === 1 && (
          <Step1
            form={jobCard}
            update={updateJobCard}
            errors={errors}
            employees={employees}
          />
        )}

        {step === 2 && (
          <Step2
            customer={customer}
            vehicle={vehicle}
            vehicleSubType={vehicleSubType}
            setVehicleSubType={setVehicleSubType}
            updateCustomer={updateCustomer}
            updateVehicle={(k, v) => {
              updateVehicle(k, v);
              if (k === 'vehicle_type') setVehicleSubType(''); // reset sub-type on type change
            }}
            errors={errors}
            matchedCustomer={customerMatch?.customer}
            matchedVehicle={vehicleMatch?.vehicle}
            phoneFromStep1={jobCard.phone_number}
          />
        )}

        {step === 3 && (
          <Step3
            services={visibleServices}
            allServices={services}
            loading={loadingServices}
            selectedIds={selectedServiceIds}
            onToggle={toggleService}
            effectivePricingType={effectivePricingType}
            basePrice={basePrice}
            gstPercent={gstPercent}
            gstAmount={gstAmount}
            totalPrice={totalPrice}
            onGstChange={setGstPercent}
            matchedCustomer={vehicleMatch?.customer}
            matchedVehicle={vehicleMatch?.vehicle}
            matchedTier={matchedTier}
          />
        )}

        <div className="flex justify-between items-center gap-2 mt-6 pt-6 border-t border-border">
          <Link to="/jobcards">
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Back
              </Button>
            )}
            {step === 3 && (
              <Button variant="secondary" type="button" onClick={handleBackFromStep3}>
                <ChevronLeft size={14} /> Back
              </Button>
            )}
            {step === 1 && (
              <Button type="button" loading={checking} onClick={handleNextFromStep1}>
                Next <ChevronRight size={14} />
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={handleNextFromStep2}>
                Next <ChevronRight size={14} />
              </Button>
            )}
            {step === 3 && (
              <Button type="button" variant="success" loading={submitting} onClick={submit}>
                <Check size={14} /> Confirm
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, skippedCustomer }) {
  const steps = [
    { n: 1, label: 'Job Card' },
    { n: 2, label: 'Customer & Vehicle' },
    { n: 3, label: 'Services' },
  ];
  return (
    <div className="flex items-center gap-2 max-w-3xl">
      {steps.map((s, i) => {
        const isActive = step === s.n;
        const isDone = step > s.n || (s.n === 2 && skippedCustomer && step === 3);
        const isSkipped = s.n === 2 && skippedCustomer && step === 3;
        return (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${isActive
                ? 'bg-accent border-accent text-white'
                : isDone
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-bg-elev border-border text-gray-400'
                }`}
            >
              {isDone ? <Check size={14} /> : s.n}
            </div>
            <span
              className={`text-xs ${isActive ? 'text-gray-100' : isSkipped ? 'text-gray-500 line-through' : 'text-gray-400'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Step1({ form, update, errors, employees }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Date" required error={errors.job_card_date}>
        <Input
          type="date"
          value={form.job_card_date}
          onChange={(e) => update('job_card_date', e.target.value)}
        />
      </Field>
      <Field label="Vehicle Number" required error={errors.vehicle_number}>
        <Input
          placeholder="e.g. KA-01-AB-1234"
          value={form.vehicle_number}
          onChange={(e) => update('vehicle_number', e.target.value)}
        />
      </Field>
      <Field label="Vehicle KM" required error={errors.vehicle_kilometers}>
        <Input
          type="number"
          step="0.01"
          placeholder="e.g. 45000"
          value={form.vehicle_kilometers}
          onChange={(e) => update('vehicle_kilometers', e.target.value)}
        />
      </Field>
      <Field label="Entry Time" required error={errors.vehicle_entry_time}>
        <Input
          type="datetime-local"
          value={form.vehicle_entry_time}
          onChange={(e) => update('vehicle_entry_time', e.target.value)}
        />
      </Field>
      <Field label="Expected Exit Time" required error={errors.vehicle_expected_exit_time}>
        <Input
          type="datetime-local"
          value={form.vehicle_expected_exit_time}
          onChange={(e) => update('vehicle_expected_exit_time', e.target.value)}
        />
      </Field>
      <Field label="Phone Number" required error={errors.phone_number}>
        <Input
          placeholder="+91 9000000000"
          value={form.phone_number}
          onChange={(e) => update('phone_number', e.target.value)}
        />
      </Field>
      <Field label="Employee" error={errors.employee}>
        <Select
          value={form.employee}
          onChange={(e) => update('employee', e.target.value)}
        >
          <option value="">Select employee (optional)</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
          ))}
        </Select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Complaints / Notes">
          <Textarea
            rows={3}
            placeholder="Customer complaints, requested work, etc."
            value={form.complaints}
            onChange={(e) => update('complaints', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function Step2({ customer, vehicle, vehicleSubType, setVehicleSubType, updateCustomer, updateVehicle, errors, matchedCustomer, matchedVehicle, phoneFromStep1 }) {
  const handleCompanySelect = async (name, isNew) => {
    updateVehicle('vehicle_company', name);
    updateVehicle('vehicle_model', '');
    if (isNew) await createVehicleCompany({ name, vehicle_type: vehicle.vehicle_type });
  };
  const handleModelSelect = async (name, isNew) => {
    updateVehicle('vehicle_model', name);
    if (isNew) await createVehicleModel({ name, company_name: vehicle.vehicle_company });
  };
  const handleColourSelect = async (name, isNew) => {
    updateVehicle('vehicle_colour', name);
    if (isNew) await createVehicleColour({ name });
  };

  /* When an existing vehicle is matched, show only the sub-type picker */
  const currentVehicleType = matchedVehicle ? matchedVehicle.vehicle_type : vehicle.vehicle_type;
  const isFourWheeler = currentVehicleType === 'four_wheeler';

  return (
    <div className="space-y-6">

      {/* ── Customer section ── */}
      {!matchedVehicle && (
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Customer Details</h3>
          {matchedCustomer ? (
            <div className="bg-emerald-900/20 border border-emerald-800 rounded-md p-3 text-sm text-emerald-100">
              Existing customer: <span className="font-semibold">{matchedCustomer.customer_name}</span>
              {matchedCustomer.phone_number ? <> · {matchedCustomer.phone_number}</> : null}
              {matchedCustomer.email ? <> · {matchedCustomer.email}</> : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Customer Name" required error={errors.customer_name}>
                <Input
                  placeholder="John Doe"
                  value={customer.customer_name}
                  onChange={(e) => updateCustomer('customer_name', e.target.value)}
                />
              </Field>
              <Field label="Phone Number">
                <div className="bg-bg-elev border border-border rounded-md px-3 py-2 text-sm text-gray-300">
                  {phoneFromStep1 || <span className="text-gray-500">—</span>}
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="Email" required error={errors.email}>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={customer.email}
                    onChange={(e) => updateCustomer('email', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Matched vehicle banner ── */}
      {matchedVehicle && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-md p-3 text-sm text-emerald-100">
          Matched existing vehicle: <span className="font-semibold">{matchedVehicle.vehicle_number}</span>
          {matchedVehicle.vehicle_type ? <> · {matchedVehicle.vehicle_type.replace('_', ' ')}</> : null}
        </div>
      )}

      {/* ── Vehicle details (only for new/partially matched vehicles) ── */}
      {!matchedVehicle && (
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Vehicle Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Vehicle Type <span className="text-red-400">*</span>
              </label>
              <VehicleTypePicker
                value={vehicle.vehicle_type}
                onChange={(v) => {
                  updateVehicle('vehicle_type', v);
                  updateVehicle('vehicle_company', '');
                  updateVehicle('vehicle_model', '');
                  setVehicleSubType('');
                }}
                error={errors.vehicle_type}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VehicleAutocomplete
                label="Company / Make"
                value={vehicle.vehicle_company}
                onChange={(v) => updateVehicle('vehicle_company', v)}
                onSelect={handleCompanySelect}
                fetchOptions={(q) => listVehicleCompanies({ q, vehicle_type: vehicle.vehicle_type })}
                onCreate={(name) => createVehicleCompany({ name, vehicle_type: vehicle.vehicle_type })}
                placeholder="e.g. Honda"
                error={errors.vehicle_company}
              />
              <VehicleAutocomplete
                label="Model"
                value={vehicle.vehicle_model}
                onChange={(v) => updateVehicle('vehicle_model', v)}
                onSelect={handleModelSelect}
                fetchOptions={(q) => listVehicleModels({ q, company: vehicle.vehicle_company })}
                onCreate={(name) => createVehicleModel({ name, company_name: vehicle.vehicle_company })}
                placeholder="e.g. City"
                error={errors.vehicle_model}
              />
              <VehicleAutocomplete
                label="Colour"
                value={vehicle.vehicle_colour}
                onChange={(v) => updateVehicle('vehicle_colour', v)}
                onSelect={handleColourSelect}
                fetchOptions={(q) => listVehicleColours({ q })}
                onCreate={(name) => createVehicleColour({ name })}
                placeholder="e.g. White"
                error={errors.vehicle_colour}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Four-wheeler sub-type picker (shown when vehicle_type is four_wheeler) ── */}
      {isFourWheeler && (
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Select Vehicle Body Type</h3>
          <p className="text-xs text-gray-500 mb-3">This determines which service prices apply.</p>
          <FourWheelerSubTypePicker
            value={vehicleSubType}
            onChange={setVehicleSubType}
            error={errors.vehicle_sub_type}
          />
        </div>
      )}
    </div>
  );
}

function Step3({ services, loading, selectedIds, onToggle, effectivePricingType, basePrice, gstPercent, gstAmount, totalPrice, onGstChange, matchedCustomer, matchedVehicle, matchedTier }) {
  if (loading) return <Loading label="Loading services..." />;

  return (
    <div className="space-y-4">
      {matchedCustomer && matchedVehicle && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-md p-3 text-sm text-emerald-100">
          Matched existing vehicle <span className="font-semibold">{matchedVehicle.vehicle_number}</span> ·
          Customer: <span className="font-semibold">{matchedCustomer.customer_name}</span>
        </div>
      )}
      {matchedTier && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          matchedTier.type === 'H'
            ? 'bg-violet-900/20 border-violet-700/50'
            : 'bg-cyan-900/20 border-cyan-700/50'
        }`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${
            matchedTier.type === 'H'
              ? 'bg-violet-800/60 text-violet-200 border border-violet-600/50'
              : 'bg-cyan-800/60 text-cyan-200 border border-cyan-600/50'
          }`}>{matchedTier.type}</span>
          <div>
            <div className={`text-xs font-semibold ${matchedTier.type === 'H' ? 'text-violet-300' : 'text-cyan-300'}`}>
              {matchedTier.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{matchedTier.value}</div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Select Services</h3>
        {effectivePricingType && (
          <p className="text-xs text-gray-500 mb-3">
            Showing services available for <span className="text-accent capitalize">{effectivePricingType.replace('_', ' ')}</span>.
            Prices shown are vehicle-specific where configured.
          </p>
        )}
        {services.length === 0 ? (
          <div className="text-sm text-gray-400 py-6 text-center border border-dashed border-border rounded-md">
            No services available{effectivePricingType ? ' for this vehicle type' : ''}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((s) => {
              const checked = selectedIds.includes(s.id);
              const price = getServicePrice(s, effectivePricingType);
              const hasCustomPrice = effectivePricingType && (s.vehicle_prices || []).some(vp => vp.vehicle_type === effectivePricingType);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className={`text-left p-3 rounded-md border transition-colors ${checked
                    ? 'bg-accent/10 border-accent'
                    : 'bg-bg border-border hover:border-gray-600'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-100 truncate">{s.service_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.service_code}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-gray-100">₹{price.toFixed(2)}</div>
                      {hasCustomPrice && (
                        <div className="text-[10px] text-accent mt-0.5">vehicle price</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-accent border-accent' : 'border-border'}`}
                    >
                      {checked && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-xs text-gray-400">
                      {checked ? 'Selected' : 'Tap to select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* GST + price summary */}
      <div className="rounded-md bg-bg-elev border border-border p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">{selectedIds.length} service{selectedIds.length === 1 ? '' : 's'} selected</span>
          <span className="text-gray-300">Base: ₹{basePrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-gray-400 shrink-0">GST %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={gstPercent}
            onChange={e => onGstChange(e.target.value)}
            className="w-24 bg-bg border border-border rounded-md px-3 py-1.5 text-sm text-gray-100 text-right focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between text-gray-400">
          <span>GST Amount</span>
          <span>₹{gstAmount.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-semibold text-gray-100">Total</span>
          <span className="text-lg font-semibold text-gray-100">₹{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
