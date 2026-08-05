'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import posthog from 'posthog-js';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPingSchema, type CreatePingInput } from '@/lib/validators/ping';
import { useCreatePingMutation } from '@/store/api';

export function PingForm() {
  const [createPing, { isLoading }] = useCreatePingMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePingInput>({
    resolver: zodResolver(createPingSchema),
    defaultValues: { note: '' },
  });

  const handleCreate = handleSubmit(async (values) => {
    const result = await createPing({ createPingDto: values });

    if (result.error) {
      toast.error('Could not save that. Check the API logs.');
      return;
    }

    posthog.capture('ping_created', { note_length: values.note.length });

    reset();
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

      <Button type="submit" disabled={isLoading} className="self-start">
        {isLoading ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
