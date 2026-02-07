import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { Document, DocumentResponse } from '@/lib/types';
import { ObjectId } from 'mongodb';

// Helper to extract user from token
function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

// GET - Get all documents for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const documentsCollection = db.collection<Document>('documents');

    const documents = await documentsCollection
      .find({ userId: user.id })
      .sort({ updatedAt: -1 })
      .toArray();

    const response: DocumentResponse[] = documents.map((doc) => ({
      id: doc._id!.toString(),
      userId: doc.userId,
      title: doc.title,
      blocks: doc.blocks,
      createdAt: new Date(doc.createdAt).getTime(),
      updatedAt: new Date(doc.updatedAt).getTime(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new document or sync multiple documents
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDatabase();
    const documentsCollection = db.collection<Document>('documents');

    // Check if it's a bulk sync request
    if (Array.isArray(body)) {
      // Bulk sync - import multiple documents
      const results: DocumentResponse[] = [];

      for (const doc of body) {
        const now = new Date();
        const newDoc: Document = {
          userId: user.id,
          title: doc.title || 'Untitled Document',
          blocks: doc.blocks || [],
          createdAt: doc.createdAt ? new Date(doc.createdAt) : now,
          updatedAt: now,
        };

        const result = await documentsCollection.insertOne(newDoc);
        results.push({
          id: result.insertedId.toString(),
          userId: user.id,
          title: newDoc.title,
          blocks: newDoc.blocks,
          createdAt: newDoc.createdAt.getTime(),
          updatedAt: newDoc.updatedAt.getTime(),
        });
      }

      return NextResponse.json(results, { status: 201 });
    }

    // Single document create
    const { title, blocks } = body;
    const now = new Date();

    const newDoc: Document = {
      userId: user.id,
      title: title || 'Untitled Document',
      blocks: blocks || [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await documentsCollection.insertOne(newDoc);

    const response: DocumentResponse = {
      id: result.insertedId.toString(),
      userId: user.id,
      title: newDoc.title,
      blocks: newDoc.blocks,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a document
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, blocks } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const documentsCollection = db.collection<Document>('documents');

    // Verify ownership
    const existingDoc = await documentsCollection.findOne({
      _id: new ObjectId(id),
      userId: user.id,
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const now = new Date();
    await documentsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: title || existingDoc.title,
          blocks: blocks || existingDoc.blocks,
          updatedAt: now,
        },
      }
    );

    const response: DocumentResponse = {
      id,
      userId: user.id,
      title: title || existingDoc.title,
      blocks: blocks || existingDoc.blocks,
      createdAt: new Date(existingDoc.createdAt).getTime(),
      updatedAt: now.getTime(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const documentsCollection = db.collection<Document>('documents');

    // Verify ownership and delete
    const result = await documentsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
