// services/contactService.ts
import database from '@/database';
import { Contact } from '@/database/models/Contact';
import { Q } from '@nozbe/watermelondb';

const contacts = database.get<Contact>('contacts');

export type ContactData = {
  shopId: string;
  name: string;
  phone: string;
  role: 'customer' | 'supplier' | 'client';
  email?: string;
  address?: string;
  isDefaultAlertContact?: boolean;
};

export async function createContact(data: ContactData) {
  return database.write(async () => {
    const contact = await contacts.create(c => {
      c.shopId = data.shopId;
      c.name = data.name;
      c.phone = data.phone;
      c.role = data.role;
      c.email = data.email;
      c.address = data.address;
      c.isDefaultAlertContact = data.isDefaultAlertContact ?? false;
      c._tableStatus = 'created';
      c._lastSyncChanged = Date.now();
    });
    return contact;
  });
}

export async function updateContact(id: string, updates: Partial<ContactData>) {
  return database.write(async () => {
    const contact = await contacts.find(id);
    await contact.update(c => {
      if (updates.name !== undefined) c.name = updates.name;
      if (updates.phone !== undefined) c.phone = updates.phone;
      if (updates.role !== undefined) c.role = updates.role;
      if (updates.email !== undefined) c.email = updates.email;
      if (updates.address !== undefined) c.address = updates.address;
      if (updates.isDefaultAlertContact !== undefined) c.isDefaultAlertContact = updates.isDefaultAlertContact;
      c._tableStatus = 'updated';
      c._lastSyncChanged = Date.now();
    });
    return contact;
  });
}

export async function deleteContact(id: string) {
  return database.write(async () => {
    const contact = await contacts.find(id);
    await contact.markAsDeleted();
    return contact;
  });
}

export async function getContactsByShop(shopId: string, role?: string) {
  let query = contacts.query(Q.where('shop_id', shopId));
  if (role) {
    query = contacts.query(Q.where('shop_id', shopId), Q.where('role', role));
  }
  return query.fetch();
}

export async function getContactById(id: string) {
  return contacts.find(id);
}