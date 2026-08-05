import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PingForm } from '@/components/ping-form';
import { makeStore } from '@/store/store';

const mockFetch = vi.fn();

const created = { id: 'png_1', note: 'hello', createdAt: '2026-08-04T12:00:00.000Z' };

// A fresh Response per call — a body can only be read once.
const respondWith = (body: unknown, status: number) => () =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  mockFetch.mockImplementation(respondWith({ data: created }, 201));
});

const renderForm = () =>
  render(
    <Provider store={makeStore()}>
      <PingForm />
    </Provider>,
  );

describe('PingForm', () => {
  it('POSTs the note to the API and clears the field', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Note'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const request = mockFetch.mock.calls[0]?.[0] as Request;

    expect(request.url).toBe('http://api.test/v1/pings');
    expect(request.method).toBe('POST');
    await expect(request.json()).resolves.toEqual({ note: 'hello' });

    await waitFor(() => expect(screen.getByLabelText('Note')).toHaveValue(''));
  });

  it('rejects a blank note client-side without touching the API', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Note is required');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps the note in the field when the API rejects it', async () => {
    mockFetch.mockImplementation(respondWith({ message: 'nope' }, 400));

    renderForm();

    await userEvent.type(screen.getByLabelText('Note'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('Note')).toHaveValue('hello'));
  });
});
