'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, ArrowLeft, ArrowRight, Check, Navigation } from 'lucide-react';
import AddressSearch from '@/components/geo/AddressSearch';
import { MapplsAutoSuggestResult } from '@/lib/geo/mappls';
import { supabase } from '@/lib/supabase-client';

const StoreMap = dynamic(() => import('@/components/geo/StoreMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )
});

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  eloc?: string;
  placeName?: string;
}

export default function RetailerLocationPage() {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  const handleAddressSelect = useCallback((result: MapplsAutoSuggestResult) => {
    const address = result.placeAddress;
    setSelectedAddress(address);
    setLocation({
      lat: result.latitude,
      lng: result.longitude,
      address: address,
      eloc: result.eLoc,
      placeName: result.placeName
    });
    setStep('confirm');
  }, []);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setLocation(prev => prev ? { ...prev, lat, lng } : null);
  }, []);

  const handleConfirmLocation = async () => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          address: location.address,
          city: extractCity(location.address),
          pincode: extractPincode(location.address),
          location: `POINT(${location.lng} ${location.lat})`
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/retailer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('search');
    setLocation(null);
    setSelectedAddress('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-2xl">Store Location</CardTitle>
          </div>
          <CardDescription>
            Search your store address and confirm its location on the map
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'search' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address-search">Search Your Store Address</Label>
                <AddressSearch
                  onSelect={handleAddressSelect}
                  placeholder="Start typing your address (Gali, Mohalla, House No...)"
                  autoFocus
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enter Manually & Pick on Map</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Latitude"
                    id="lat-input"
                  />
                  <Input
                    type="number"
                    placeholder="Longitude"
                    id="lng-input"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const latInput = document.getElementById('lat-input') as HTMLInputElement;
                    const lngInput = document.getElementById('lng-input') as HTMLInputElement;
                    if (latInput.value && lngInput.value) {
                      setLocation({
                        lat: parseFloat(latInput.value),
                        lng: parseFloat(lngInput.value),
                        address: 'Custom location',
                      });
                      setStep('confirm');
                    }
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Use These Coordinates
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Or Place Pin Directly on Map</Label>
                <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
                  <StoreMap
                    lat={28.6139}
                    lng={77.2090}
                    onLocationChange={handleLocationChange}
                    onAddressFetch={(address) => {
                      setSelectedAddress(address);
                    }}
                    markerDraggable={true}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Click on the map or drag the pin to set your store location
                </p>
                {location && (
                  <Button
                    className="w-full"
                    onClick={() => setStep('confirm')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirm This Location
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'confirm' && location && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Your Store Location</Label>
                <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
                  <StoreMap
                    lat={location.lat}
                    lng={location.lng}
                    onLocationChange={handleLocationChange}
                    markerDraggable={true}
                  />
                </div>
                {selectedAddress && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedAddress}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                    {location.placeName && (
                      <p className="text-sm text-gray-500">
                        Place: {location.placeName}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center">
                  Drag the pin to adjust if needed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-address">Confirm Your Full Address</Label>
                <Input
                  id="confirm-address"
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  placeholder="Enter your complete store address"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleConfirmLocation}
                  disabled={isLoading || !selectedAddress}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm & Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function extractCity(address: string): string {
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return '';
}

function extractPincode(address: string): string {
  const pincodeMatch = address.match(/\d{6}/);
  return pincodeMatch ? pincodeMatch[0] : '';
}