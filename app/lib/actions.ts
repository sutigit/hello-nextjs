
// Wow, this makes all the exports Server Actions 
'use server';

// Data validation and preparation, chapter 12
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
 
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    // Inserting data to database
    await sql`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
      return { message: 'Database Error: Failed to Create Invoice.' };
    }

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

export async function updateInvoice(
  id: string,
  prevState: State, 
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    }
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

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
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }

  // Since you're updating the data displayed in the invoices route, 
  // you want to clear this cache and trigger a new request to the server. 
  // You can do this with the revalidatePath function from Next.js:
  revalidatePath('/dashboard/invoices');

  // Since this action is being called in the /dashboard/invoices path, you don't need to call redirect. 
}