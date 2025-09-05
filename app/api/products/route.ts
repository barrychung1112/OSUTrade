import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();  // Make instance of createClient

    // 1. Get parameters from URL
    const searchParams = request.nextUrl.searchParams;  // Get parameters after ?
    const name = searchParams.get('name');
    const category = searchParams.get('category'); 
    const sort = searchParams.get('sort'); 

    // Get pagination or set default 
    const page = parseInt(searchParams.get('page') || '1', 10);   // 10 stands for deciaml sys
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const rangeFrom = (page - 1) * limit;               // ex, (Page(1) - 1) * 12 = 0, which means 0 item 
    const rangeTo = rangeFrom + limit - 1;

    // 2. Build a Supabase query
    // Make basic query
    // Using { count: 'exact' }, get all prodocts
    let query = supabase         // Make query objest
      .from('products')
      .select('product_id, name, price, category, image_url', { count: 'exact' });

    if (name) {
      query = query.ilike('name', `%${name}%`); // % is wildcard that stands for more than 0 character?
    }

    if (category) {
      query = query.eq('category', category); 
    }

    if (sort === 'asc' || sort === 'desc') {
      query = query.order('price', { ascending: sort === 'asc' }); // if true, it's ascending
    }

    query = query.range(rangeFrom, rangeTo);

    // 3. run query
    const { data, error, count } = await query;  //Destructuring Assignment

    if (error) {
      throw error;
    }

    // 4. Return data
    return NextResponse.json({
      data: data, 
      total: count, 
      page: page,
      limit: limit,
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}