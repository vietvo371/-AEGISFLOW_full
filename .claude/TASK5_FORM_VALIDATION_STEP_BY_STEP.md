# ✏️ Task #5 - Form Validation & Error Handling (Step-by-Step)

**Time**: 4-5 hours  
**Status**: In Progress  
**Focus**: Add Zod validation + error display to all forms

---

## 🚀 Step 1: Install Zod (5 minutes)

```bash
cd frontend
npm install zod
```

Verify installation:
```bash
npm list zod  # Should show zod@latest
```

---

## 📝 Step 2: Create Validation Schemas (45 minutes)

Create `frontend/src/lib/validations/auth.ts`:

```typescript
import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string()
    .min(2, 'Tên phải có ít nhất 2 ký tự')
    .max(50, 'Tên tối đa 50 ký tự'),
  
  email: z.string()
    .email('Email không hợp lệ')
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^[0-9]{10,11}$/, 'Số điện thoại phải là 10-11 chữ số'),
  
  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ cái in hoa')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
  
  password_confirmation: z.string(),
}).refine(
  (data) => data.password === data.password_confirmation,
  {
    message: 'Mật khẩu không khớp',
    path: ['password_confirmation'],
  }
);

export const signInSchema = z.object({
  email: z.string()
    .email('Email không hợp lệ'),
  
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
```

Create `frontend/src/lib/validations/rescue.ts`:

```typescript
import { z } from 'zod';

export const rescueRequestSchema = z.object({
  caller_name: z.string()
    .min(2, 'Tên phải có ít nhất 2 ký tự')
    .max(50, 'Tên tối đa 50 ký tự'),
  
  caller_phone: z.string()
    .regex(/^[0-9]{10,11}$/, 'Số điện thoại phải là 10-11 chữ số'),
  
  urgency: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Vui lòng chọn mức độ khẩn cấp' })
  }),
  
  category: z.enum(['rescue', 'shelter', 'medical', 'food'], {
    errorMap: () => ({ message: 'Vui lòng chọn danh mục' })
  }),
  
  people_count: z.string()
    .refine((v) => /^[1-9]\d*$/.test(v), 'Số người phải ≥ 1')
    .transform((v) => parseInt(v, 10)),
  
  water_level_m: z.string()
    .optional()
    .refine(
      (v) => !v || /^[0-9]+(\.[0-9]+)?$/.test(v),
      'Mực nước phải là số hợp lệ'
    ),
  
  description: z.string()
    .optional()
    .refine((v) => !v || v.length <= 500, 'Mô tả tối đa 500 ký tự'),
});

export type RescueRequestInput = z.infer<typeof rescueRequestSchema>;
```

---

## 🔧 Step 3: Update Signup Form (1 hour)

Replace `frontend/src/app/(auth)/signup/page.tsx`:

```typescript
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function SignUpPage() {
  const t = useTranslations('auth');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Form state
  const [formData, setFormData] = React.useState<SignUpInput>({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  
  // Error state
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignUpInput, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof SignUpInput]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // Validate with Zod
      const validated = signUpSchema.parse(formData);

      const api = (await import('@/lib/api')).default;
      const res = await api.post('/auth/register', validated);

      if (res.data?.success) {
        const { token } = res.data.data;
        localStorage.setItem('aegisflow_token', token);
        document.cookie = `aegisflow_token=${token}; path=/; max-age=86400; SameSite=Lax`;

        toast.success('Đăng ký thành công! Chuyển hướng...');
        window.location.href = '/citizen';
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to field map
        const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
        error.errors.forEach(err => {
          const fieldName = err.path[0] as keyof SignUpInput;
          if (fieldName) {
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Vui lòng kiểm tra lại các trường');
      } else if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        // Ignore abort errors
      } else {
        const message = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{t('createAccount')}</h2>
        <p className="text-sm text-muted-foreground">{t('signUpDesc')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('fullName')}
          </Label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t('fullNamePlaceholder')}
              className={`h-11 rounded-xl bg-muted/30 pl-9 ${
                errors.name ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('email')}
          </Label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className={`h-11 rounded-xl bg-muted/30 pl-9 ${
                errors.email ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('phone')}
          </Label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              className={`h-11 rounded-xl bg-muted/30 pl-9 ${
                errors.phone ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.phone}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              className={`h-11 rounded-xl bg-muted/30 pl-9 pr-10 ${
                errors.password ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('confirmPassword')}
          </Label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('confirmPasswordPlaceholder')}
              className={`h-11 rounded-xl bg-muted/30 pl-9 pr-10 ${
                errors.password_confirmation ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete="new-password"
              required
              value={formData.password_confirmation}
              onChange={handleChange}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password_confirmation && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.password_confirmation}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            t('signUp')
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <Separator />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          {t('or')}
        </span>
      </div>

      {/* Sign In Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/signin" className="font-semibold text-foreground hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
```

---

## 🔧 Step 4: Update Signin Form (45 minutes)

Update `frontend/src/app/(auth)/signin/page.tsx` similarly:

```typescript
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { signInSchema, type SignInInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function SignInPage() {
  const t = useTranslations('auth');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const [formData, setFormData] = React.useState<SignInInput>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignInInput, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof SignInInput]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = signInSchema.parse(formData);

      const api = (await import('@/lib/api')).default;
      const res = await api.post('/auth/login', validated);

      if (res.data?.success) {
        const { token } = res.data.data;
        localStorage.setItem('aegisflow_token', token);
        document.cookie = `aegisflow_token=${token}; path=/; max-age=86400; SameSite=Lax`;

        toast.success('Đăng nhập thành công!');
        window.location.href = '/citizen';
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof SignInInput, string>> = {};
        error.errors.forEach(err => {
          const fieldName = err.path[0] as keyof SignInInput;
          if (fieldName) fieldErrors[fieldName] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Vui lòng kiểm tra lại');
      } else {
        toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black">{t('welcome')}</h2>
        <p className="text-sm text-muted-foreground">{t('signInDesc')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className={`h-11 rounded-xl pl-9 ${errors.email ? 'border-red-500' : ''}`}
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500">⚠ {errors.email}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              className={`h-11 rounded-xl pl-9 pr-10 ${errors.password ? 'border-red-500' : ''}`}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">⚠ {errors.password}</p>}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            t('signIn')
          )}
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/signup" className="font-semibold hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </div>
  );
}
```

---

## 🆘 Step 5: Update Citizen Request Form (1 hour)

Update `frontend/src/app/citizen/request/page.tsx` with validation. Key additions:

```typescript
import { rescueRequestSchema } from '@/lib/validations/rescue';

// Add to state:
const [errors, setErrors] = React.useState<Record<string, string>>({});

// Update handleSubmit:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrors({});
  
  try {
    const validated = rescueRequestSchema.parse({
      caller_name: form.caller_name,
      caller_phone: form.caller_phone,
      urgency: form.urgency,
      category: form.category,
      people_count: form.people_count,
      water_level_m: form.water_level_m,
      description: form.description,
    });
    
    setSubmitting(true);
    const res = await api.post('/rescue-requests', {
      ...validated,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    
    toast.success('Yêu cầu cứu trợ đã được gửi!');
    // Refresh requests
    await fetchMyRequests();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
    } else {
      toast.error('Lỗi khi gửi yêu cầu');
    }
  } finally {
    setSubmitting(false);
  }
};

// Add error display in JSX:
{errors.caller_name && <p className="text-xs text-red-500">⚠ {errors.caller_name}</p>}
```

---

## ✅ Step 6: Test All Forms (30 minutes)

```bash
cd frontend
yarn dev
```

### Test Signup:
1. Navigate to http://localhost:3000/signup
2. Try submit empty → Should see errors for all fields
3. Try invalid email → Should see "Email không hợp lệ"
4. Try mismatched passwords → Should see "Mật khẩu không khớp"
5. Try weak password → Should see specific requirements
6. Try phone with letters → Should see "Số điện thoại phải là 10-11 chữ số"
7. Enter valid data → Should submit successfully
8. Test on mobile (DevTools) → Should look good

### Test Signin:
1. Navigate to http://localhost:3000/signin
2. Try submit empty → Should see errors
3. Try invalid email → Should see error
4. Try valid data → Should submit

### Test Citizen Request:
1. Login as citizen
2. Go to /citizen/request
3. Try submit without selecting location → Should see error
4. Try invalid people_count → Should see error
5. Fill all fields correctly → Should submit

---

## 🎉 Success Criteria

- ✅ All forms have Zod validation schemas
- ✅ Field errors display below each input
- ✅ Errors clear when user starts typing
- ✅ Loading spinner shows during submission
- ✅ Success toast shows on successful submit
- ✅ Error toast shows on API failure
- ✅ Forms work on mobile (responsive)
- ✅ No console errors
- ✅ Password requirements visible
- ✅ Phone format validated

---

**Time to complete**: 4-5 hours  
**Complexity**: Medium  
**Blockers**: None

Ready to start? Begin with Step 1 (Install Zod) now!
