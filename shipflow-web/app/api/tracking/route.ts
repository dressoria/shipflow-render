import { NextResponse } from "next/server";
import { getRealTracking } from "@/lib/services/realTrackingService";

type TrackingRequest = {
  trackingNumber?: string;
  courier?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackingRequest;
    const trackingNumber = body.trackingNumber?.trim();
    const courier = body.courier?.trim();

    if (!trackingNumber || !courier) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Enter a tracking number and carrier to check shipment status.",
        },
        { status: 400 },
      );
    }

    const data = await getRealTracking(trackingNumber, courier);

    return NextResponse.json({
      success: true,
      data,
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? `We could not check this carrier right now: ${error.message}`
            : "We could not check this carrier right now.",
      },
      { status: 502 },
    );
  }
}
