
// Wow, this makes all the exports Server Actions 
'use server';

// Data validation and preparation, chapter 12
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(formData: FormData) {
  // Validation
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Preparation
  // Note: It's usually good practice to store monetary values in cents in your database to eliminate JavaScript floating-point errors and ensure greater accuracy.
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Inserting data to database
  await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

  // Since you're updating the data displayed in the invoices route, 
  // you want to clear this cache and trigger a new request to the server. 
  // You can do this with the revalidatePath function from Next.js:
  revalidatePath('dashboard/invoices');

  // You also want to redirect the 
  // user back to the / dashboard / invoices page.
  // You can do this with the redirect function from Next.js:
  redirect('dashboard/invoices');
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  // Since you're updating the data displayed in the invoices route, 
  // you want to clear this cache and trigger a new request to the server. 
  // You can do this with the revalidatePath function from Next.js:
  revalidatePath('/dashboard/invoices');


  // You also want to redirect the 
  // user back to the / dashboard / invoices page.
  // You can do this with the redirect function from Next.js:
  redirect('/dashboard/invoices');
}


export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;

  // Since you're updating the data displayed in the invoices route, 
  // you want to clear this cache and trigger a new request to the server. 
  // You can do this with the revalidatePath function from Next.js:
  revalidatePath('/dashboard/invoices');

  // Since this action is being called in the /dashboard/invoices path, you don't need to call redirect. 
}