# MongoDB Setup for SDG3 Hackathon

## Configuration

1. **Update MongoDB Connection String**
   
   Edit `.env.local` and update the `MONGODB_URI`:

   - **For local MongoDB:**
     ```
     MONGODB_URI=mongodb://localhost:27017/sdg3-hackathon
     ```

   - **For MongoDB Atlas:**
     ```
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
     ```


## Project Structure

- **`lib/mongodb.ts`** - Database connection utility with connection caching
- **`models/User.ts`** - Example Mongoose model (User schema)
- **`app/api/users/route.ts`** - Example API routes demonstrating MongoDB usage

## Usage

### Connecting to MongoDB in API Routes

```typescript
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await connectDB();
  const users = await User.find({});
  return Response.json(users);
}
```

### Testing the API

Start the development server:
```bash
npm run dev
```

Test the users endpoint:
- GET: `http://localhost:3000/api/users`
- POST: `http://localhost:3000/api/users` (with JSON body)

## Creating New Models

Create new model files in the `models/` directory:

```typescript
import mongoose, { Schema, Model, models } from 'mongoose';

export interface IYourModel {
  // your fields
}

const YourSchema = new Schema<IYourModel>({
  // your schema definition
}, { timestamps: true });

const YourModel: Model<IYourModel> = 
  models.YourModel || mongoose.model<IYourModel>('YourModel', YourSchema);

export default YourModel;
```

## Notes

- The connection uses caching to prevent multiple connections in development
- Remember to add `.env.local` to `.gitignore` (already done)
- Mongoose handles connection pooling automatically
