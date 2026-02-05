import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runQueries() {
  try {
    console.log('Connected to database\n');
    
    // Query 1: Check booking hold
    console.log('=== Query 1: Check if the hold still exists ===');
    const hold = await prisma.$queryRaw`
      SELECT * FROM booking_holds WHERE id = '9cbdeddd-8af9-4b9e-830f-005c8abcc9db'
    `;
    console.log('Rows found:', hold.length);
    if (hold.length > 0) {
      console.log(JSON.stringify(hold, null, 2));
    } else {
      console.log('No booking hold found with this ID');
    }
    console.log('\n');
    
    // Query 2: Check bookings
    console.log('=== Query 2: Check if any booking was created with this email ===');
    const bookings = await prisma.$queryRaw`
      SELECT * FROM bookings WHERE customer_email = 'erfrischendlustvollerrabe@fukaru.com' ORDER BY created_at DESC LIMIT 5
    `;
    console.log('Rows found:', bookings.length);
    if (bookings.length > 0) {
      console.log(JSON.stringify(bookings, null, 2));
    } else {
      console.log('No bookings found with this email');
    }
    console.log('\n');
    
    // Query 3: Check customer
    console.log('=== Query 3: Check if customer was created ===');
    const customer = await prisma.$queryRaw`
      SELECT * FROM customers WHERE email = 'erfrischendlustvollerrabe@fukaru.com'
    `;
    console.log('Rows found:', customer.length);
    if (customer.length > 0) {
      console.log(JSON.stringify(customer, null, 2));
    } else {
      console.log('No customer found with this email');
    }
    console.log('\n');
    
    // Query 4: Check service
    console.log('=== Query 4: Verify the service exists ===');
    const service = await prisma.$queryRaw`
      SELECT * FROM services WHERE id = '761ebbb6-7ba0-4504-9ce7-6316e49283b8'
    `;
    console.log('Rows found:', service.length);
    if (service.length > 0) {
      console.log(JSON.stringify(service, null, 2));
    } else {
      console.log('No service found with this ID');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runQueries();
