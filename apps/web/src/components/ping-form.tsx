'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPingSchema, type CreatePingInput } from '@/server/validators/ping';

export function PingForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePingInput>({
    resolver: zodResolver(createPingSchema),
    defaultValues: { note: '' },
  });

  const handleCreate = handleSubmit(async (values) => {
    const response = await fetch('/api/pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      toast.error('Could not save that. Check the server logs.');
      return;
    }

    reset();
    router.refresh();
    toast.success('Saved.');
  });

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          placeholder="Write something and hit save"
          aria-invalid={Boolean(errors.note)}
          {...register('note')}
        />
        {errors.note ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.note.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
