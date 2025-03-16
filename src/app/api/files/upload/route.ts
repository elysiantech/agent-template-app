import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: `https://example.com/uploads/${file.name}`, // Mock URL (replace with actual storage logic)
    }));

    return NextResponse.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}