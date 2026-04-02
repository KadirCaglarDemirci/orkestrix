import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class GooglePlacesIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "google-places",
    name: "Google Places",
    description: "Google Haritalar'da firma ara, detayları ve iletişim bilgilerini al",
    icon: "🗺️",
    category: "research",
    authType: "apiKey",
    credentialFields: [
      {
        key: "apiKey",
        label: "Google Places API Key",
        type: "password",
        required: true,
        helpText: "Google Cloud Console → Places API → Credentials",
      },
    ],
    operations: [
      {
        id: "searchBusinesses",
        name: "Firmaları Ara",
        description: "Belirtilen konumda firma ara",
        parameters: [
          { key: "query", label: "Arama Sorgusu", type: "string", required: true, placeholder: "istanbul restoran" },
          { key: "location", label: "Konum (lat,lng)", type: "string", required: false, placeholder: "41.0082,28.9784" },
          { key: "radius", label: "Yarıçap (metre)", type: "number", required: false, placeholder: "5000" },
          { key: "maxResults", label: "Maksimum Sonuç", type: "number", required: false, placeholder: "10" },
        ],
      },
      {
        id: "getPlaceDetails",
        name: "Firma Detayı Al",
        description: "Place ID ile firma detaylarını, web sitesini ve emailini al",
        parameters: [
          { key: "placeId", label: "Place ID", type: "string", required: true },
        ],
      },
      {
        id: "searchAndDetails",
        name: "Ara ve Detayları Getir",
        description: "Arama yap ve her firma için tam detayları otomatik al",
        parameters: [
          { key: "query", label: "Arama Sorgusu", type: "string", required: true, placeholder: "istanbul muhasebe ofisi" },
          { key: "location", label: "Konum (lat,lng)", type: "string", required: false },
          { key: "radius", label: "Yarıçap (metre)", type: "number", required: false, placeholder: "10000" },
          { key: "maxResults", label: "Maksimum Firma", type: "number", required: false, placeholder: "5" },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { apiKey } = context.credentials;
    const p = context.parameters;

    if (operationId === "searchBusinesses") {
      return this.searchBusinesses(apiKey, p);
    }
    if (operationId === "getPlaceDetails") {
      return this.getPlaceDetails(apiKey, String(p.placeId));
    }
    if (operationId === "searchAndDetails") {
      const results = await this.searchBusinesses(apiKey, p) as any;
      const places = (results.results ?? []).slice(0, Number(p.maxResults ?? 5));
      const detailed = await Promise.all(
        places.map((place: any) => this.getPlaceDetails(apiKey, place.place_id))
      );
      return { businesses: detailed, total: detailed.length };
    }

    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async searchBusinesses(apiKey: string, p: Record<string, unknown>) {
    const params: Record<string, string> = {
      query: String(p.query),
      key: apiKey,
      language: "tr",
    };
    if (p.location) params.location = String(p.location);
    if (p.radius) params.radius = String(p.radius);

    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    const data = await res.json() as any;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API hatası: ${data.status} — ${data.error_message ?? ""}`);
    }

    return {
      results: (data.results ?? []).slice(0, Number(p.maxResults ?? 20)),
      total: data.results?.length ?? 0,
    };
  }

  private async getPlaceDetails(apiKey: string, placeId: string) {
    const fields = [
      "place_id", "name", "formatted_address", "formatted_phone_number",
      "website", "rating", "user_ratings_total", "opening_hours",
      "business_status", "types", "photos", "url",
    ].join(",");

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", fields);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "tr");

    const res = await fetch(url.toString());
    const data = await res.json() as any;

    if (data.status !== "OK") {
      throw new Error(`Place Details hatası: ${data.status}`);
    }

    const result = data.result;

    // Fotoğraf URL'lerini oluştur
    const photoUrls = (result.photos ?? []).slice(0, 5).map((photo: any) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`
    );

    return {
      placeId: result.place_id,
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number ?? null,
      website: result.website ?? null,
      rating: result.rating ?? null,
      reviewCount: result.user_ratings_total ?? 0,
      mapsUrl: result.url,
      status: result.business_status,
      types: result.types ?? [],
      photoUrls,
    };
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      url.searchParams.set("query", "test");
      url.searchParams.set("key", credentials.apiKey);
      const res = await fetch(url.toString());
      const data = await res.json() as any;
      return data.status !== "REQUEST_DENIED";
    } catch {
      return false;
    }
  }
}
