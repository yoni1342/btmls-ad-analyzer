import { NextResponse } from 'next/server';
import sampleData from '../../../sample.json';

export async function GET() {
  // In a real app, this would fetch data from a database
  return NextResponse.json(sampleData);
} 