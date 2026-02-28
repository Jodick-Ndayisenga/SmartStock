// app/(tabs)/scan.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import database from '@/database';
import { Product } from '@/database/models/Product';
import { Shop } from '@/database/models/Shop';
import { useAuth } from '@/context/AuthContext';
import { Q } from '@nozbe/watermelondb';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useColorScheme } from 'nativewind';

// Types
type ScanMode = 'barcode' | 'qr' | 'text' | 'list';
type ScanResult = {
  type: 'barcode' | 'qr' | 'text';
  data: string;
  timestamp: Date;
  confidence?: number;
};

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [zoom, setZoom] = useState(0);
  
  // Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set());
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualText, setManualText] = useState('');
  const [textLines, setTextLines] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundProducts, setFoundProducts] = useState<Product[]>([]);
  
  // Shop and product data
  const [shop, setShop] = useState<Shop | null>(null);
  const productsCollection = database.get<Product>('products');
  
  // Camera ref
  const cameraRef = useRef<any>(null);
  
  // Check permissions
  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  // Load shop data
  useEffect(() => {
    const loadShop = async () => {
      if (currentShop) {
        try {
          const shopData = await database.get<Shop>('shops').find(currentShop.id);
          setShop(shopData);
        } catch (error) {
          console.error('Error loading shop:', error);
        }
      }
    };
    
    loadShop();
  }, [currentShop]);
  
  // Handle barcode scanning
  const handleBarcodeScanned = ({ data, type }: { data: string; type: string }) => {
    if (scannedBarcodes.has(data)) return;
    
    setIsScanning(false);
    setScannedBarcodes(prev => new Set([...prev, data]));
    
    const newResult: ScanResult = {
      type: 'barcode',
      data,
      timestamp: new Date(),
      confidence: 0.9,
    };
    
    setScanResults(prev => [newResult, ...prev.slice(0, 9)]);
    searchProductByBarcode(data);
    
    // Resume scanning after 2 seconds
    setTimeout(() => setIsScanning(true), 2000);
  };
  
  // Handle QR code scanning
  const handleQRScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    
    const newResult: ScanResult = {
      type: 'qr',
      data,
      timestamp: new Date(),
      confidence: 0.9,
    };
    
    setScanResults(prev => [newResult, ...prev.slice(0, 9)]);
    
    // Check if it's a product QR
    if (data.includes('PRODUCT:')) {
      const productId = data.replace('PRODUCT:', '').trim();
      searchProductById(productId);
    }
  };
  
  // Search product by barcode
  const searchProductByBarcode = async (barcode: string) => {
    if (!currentShop) return;
    
    setIsProcessing(true);
    try {
      const products = await productsCollection.query(
        Q.where('barcode', barcode),
        Q.where('shop_id', currentShop.id)
      ).fetch();
      
      if (products.length > 0) {
        setFoundProducts(prev => [...products, ...prev]);
        Alert.alert(
          'Produit trouvé',
          `${products[0].name} a été trouvé dans votre inventaire.`,
          [
            { text: 'Voir', onPress: () => router.push(`/(auth)/edit-product/${products[0].id}`) },
            { text: 'Continuer', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Produit non trouvé',
          `Le code ${barcode} n'est pas dans votre inventaire.`,
          [
            { text: 'Ajouter', onPress: () => router.push({
              pathname: '/(auth)/add-product',
              params: { barcode }
            }) },
            { text: 'Ignorer', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Search product by ID
  const searchProductById = async (productId: string) => {
    try {
      const product = await productsCollection.find(productId);
      if (product) {
        setFoundProducts(prev => [product, ...prev]);
        Alert.alert(
          'Produit trouvé',
          product.name,
          [
            { text: 'Voir', onPress: () => router.push(`/(auth)/edit-product/${product.id}`) },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Product not found:', error);
    }
  };
  
  // Search product by text
  const searchProductByText = async (text: string) => {
    if (!currentShop || !text.trim()) return;
    
    setIsProcessing(true);
    try {
      const products = await productsCollection.query(
        Q.where('shop_id', currentShop.id),
        Q.or(
          Q.where('name', Q.like(`%${text}%`)),
          Q.where('sku', Q.like(`%${text}%`)),
          Q.where('description', Q.like(`%${text}%`))
        )
      ).fetch();
      
      setFoundProducts(products);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Process text list (for paper list scanning)
  const processTextList = () => {
    const lines = manualText.split('\n').filter(line => line.trim().length > 0);
    setTextLines(lines);
    
    // Try to extract product names from each line
    const potentialProducts = lines.map(line => {
      // Simple extraction - could be enhanced with NLP
      const words = line.split(/\s+/);
      // Look for patterns like: "10kg Sucre 2000 2500"
      const productName = words.slice(1, words.length - 2).join(' ') || line;
      return productName.trim();
    }).filter(name => name.length > 0);
    
    // Search for each product
    potentialProducts.forEach(productName => {
      searchProductByText(productName);
    });
    
    Alert.alert(
      'Liste analysée',
      `${lines.length} lignes traitées. ${potentialProducts.length} produits potentiels identifiés.`
    );
  };
  
  // Add manual barcode
  const addManualBarcode = () => {
    if (!manualBarcode.trim()) return;
    
    const newResult: ScanResult = {
      type: 'barcode',
      data: manualBarcode,
      timestamp: new Date(),
      confidence: 1.0,
    };
    
    setScanResults(prev => [newResult, ...prev.slice(0, 9)]);
    searchProductByBarcode(manualBarcode);
    setManualBarcode('');
  };
  
  // Clear all results
  const clearResults = () => {
    setScanResults([]);
    setScannedBarcodes(new Set());
    setFoundProducts([]);
    setTextLines([]);
    setManualText('');
  };
  
  // Toggle camera
  const toggleCamera = () => {
    if (scanMode === 'barcode' || scanMode === 'qr') {
      if (isCameraActive) {
        setIsCameraActive(false);
      } else {
        if (hasPermission === false) {
          Alert.alert(
            'Permission requise',
            'L\'application a besoin d\'accéder à la caméra pour scanner.',
            [{ text: 'OK', onPress: requestPermission }]
          );
        } else {
          setIsCameraActive(true);
          setIsScanning(true);
        }
      }
    }
  };
  
  // Toggle flash
  const toggleFlash = () => {
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };
  
  // Switch camera
  const switchCamera = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };
  
  // Zoom in/out
  const adjustZoom = (direction: 'in' | 'out') => {
    setZoom(current => {
      const newZoom = direction === 'in' ? current + 0.1 : current - 0.1;
      return Math.max(0, Math.min(1, newZoom));
    });
  };
  
  // Copy barcode to clipboard
  const copyToClipboard = (barcode: string) => {
    // You would use expo-clipboard here
    Alert.alert('Copié', `Code ${barcode} copié dans le presse-papier`);
  };
  
  // Quick actions
  const quickActions = [
    {
      id: 'stock_check',
      title: 'Vérifier stock',
      icon: 'cube-outline',
      color: '#3B82F6',
      onPress: () => router.push('/(tabs)/products'),
    },
    {
      id: 'add_product',
      title: 'Ajouter produit',
      icon: 'add-circle-outline',
      color: '#10B981',
      onPress: () => router.push('/(auth)/add-product'),
    },
    {
      id: 'inventory',
      title: 'Inventaire',
      icon: 'clipboard-outline',
      color: '#8B5CF6',
      onPress: () => router.push('/(tabs)/inventory'),
    },
    {
      id: 'recent_scans',
      title: 'Scans récents',
      icon: 'time-outline',
      color: '#F59E0B',
      onPress: () => {}, // Would show history
    },
  ];
  
  // Render camera view
  const renderCamera = () => {
    if (!hasPermission) {
      return (
        <View className="flex-1 items-center justify-center bg-gray-900 p-4">
          <Ionicons name="camera-off-outline" size={64} color="#9CA3AF" />
          <ThemedText variant="default" className="text-center mt-4">
            L'accès à la caméra est requis pour scanner.
          </ThemedText>
          <Button onPress={requestPermission} className="mt-4">
            Autoriser l'accès
          </Button>
        </View>
      );
    }
    
    return (
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={cameraType}
          flash={flash}
          zoom={zoom}
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: scanMode === 'barcode' 
              ? ['ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code128'] 
              : ['qr'],
          }}
        />
        
        {/* Camera overlay */}
        <View className="absolute top-0 left-0 right-0 bottom-0">
          {/* Top controls */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => setIsCameraActive(false)}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={toggleFlash}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Ionicons 
                name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off'} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Scanning frame */}
          <View className="absolute top-1/2 left-1/2 -translate-x-32 -translate-y-32 w-64 h-64">
            <View className="absolute top-0 left-0 right-0 h-2 bg-brand" style={{ opacity: 0.7 }} />
            <View className="absolute bottom-0 left-0 right-0 h-2 bg-brand" style={{ opacity: 0.7 }} />
            <View className="absolute left-0 top-0 bottom-0 w-2 bg-brand" style={{ opacity: 0.7 }} />
            <View className="absolute right-0 top-0 bottom-0 w-2 bg-brand" style={{ opacity: 0.7 }} />
            
            <View className="absolute -top-8 left-1/2 -translate-x-1/2">
              <ThemedText variant="label" className="text-center">
                {scanMode === 'barcode' ? 'Placez le code-barres dans le cadre' : 'Scannez le QR code'}
              </ThemedText>
            </View>
          </View>
          
          {/* Bottom controls */}
          <View className="absolute bottom-8 left-0 right-0 items-center">
            <View className="flex-row items-center space-x-6">
              <TouchableOpacity
                onPress={() => adjustZoom('out')}
                className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
              >
                <Ionicons name="remove-outline" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setIsScanning(!isScanning)}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
              >
                <View className={`w-16 h-16 rounded-full ${isScanning ? 'bg-red-500' : 'bg-white'}`} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={switchCamera}
                className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
              >
                <Ionicons name="camera-reverse-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={() => adjustZoom('in')}
              className="w-12 h-12 rounded-full bg-black/50 items-center justify-center mt-4"
            >
              <Ionicons name="add-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Render manual input for list scanning
  const renderListInput = () => {
    return (
      <View className="flex-1 p-4">
        <Card className="mb-4">
          <CardContent className="p-4">
            <ThemedText variant="subheading" className="mb-2">
              Scanner une liste papier
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="mb-3">
              Collez ou tapez votre liste de produits. Chaque produit sur une nouvelle ligne.
            </ThemedText>
            
            <Input
              value={manualText}
              onChangeText={setManualText}
              placeholder={`Exemple:
10kg Sucre 2000 2500
5L Huile 3000 4000
20 Paquets Thé 500 800`}
              multiline
              numberOfLines={8}
              className="min-h-[150px]"
            />
            
            <View className="flex-row gap-3 mt-3">
              <Button variant="outline" onPress={() => setManualText('')} className="flex-1">
                Effacer
              </Button>
              <Button onPress={processTextList} className="flex-1" loading={isProcessing}>
                Analyser
              </Button>
            </View>
          </CardContent>
        </Card>
        
        {textLines.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-3">
                <ThemedText variant="subheading">
                  {textLines.length} lignes analysées
                </ThemedText>
                <Badge variant="info">{textLines.length}</Badge>
              </View>
              
              <ScrollView className="max-h-64">
                {textLines.map((line, index) => (
                  <View key={index} className="py-2 border-b border-gray-200 dark:border-gray-700">
                    <ThemedText variant="default" size="sm">{line}</ThemedText>
                  </View>
                ))}
              </ScrollView>
            </CardContent>
          </Card>
        )}
      </View>
    );
  };
  
  // Render manual barcode input
  const renderManualBarcode = () => {
    return (
      <View className="flex-1 p-4">
        <Card className="mb-4">
          <CardContent className="p-4">
            <ThemedText variant="subheading" className="mb-2">
              Entrer un code-barres manuellement
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="mb-3">
              Tapez le code-barres ou scannez-le avec votre appareil photo.
            </ThemedText>
            
            <Input
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Ex: 123456789012"
              keyboardType="numeric"
              leftIcon="barcode-outline"
            />
            
            <Button onPress={addManualBarcode} disabled={!manualBarcode.trim()} className="mt-2">
              <Ionicons name="search-outline" size={20} className="mr-2" />
              Rechercher ce code
            </Button>
          </CardContent>
        </Card>
        
        <View className="flex-row gap-2 mb-4">
          <Button 
            variant={scanMode === 'barcode' ? 'default' : 'outline'} 
            size="sm"
            onPress={toggleCamera}
          >
            <Ionicons name="camera-outline" size={16} className="mr-1" />
            Scanner
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onPress={() => router.push('/(auth)/add-product')}
          >
            <Ionicons name="add-outline" size={16} className="mr-1" />
            Ajouter produit
          </Button>
        </View>
      </View>
    );
  };
  
  // Render main content when camera is not active
  const renderMainContent = () => {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Shop info */}
          {shop && (
            <Card className="mb-4 bg-brand/5 border-brand/20">
              <CardContent className="p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="business" size={16} className="text-brand mr-2" />
                    <ThemedText variant="brand" size="sm">
                      Scanner pour: {shop.name}
                    </ThemedText>
                  </View>
                  <Badge variant="success">
                    {scanMode === 'barcode' ? 'Code-barres' : 
                     scanMode === 'qr' ? 'QR Code' : 
                     scanMode === 'text' ? 'Liste' : 'Recherche'}
                  </Badge>
                </View>
              </CardContent>
            </Card>
          )}
          
          {/* Mode selector */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <ThemedText variant="subheading" className="mb-3">
                Mode de scan
              </ThemedText>
              
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setScanMode('barcode')}
                  className={`flex-1 min-w-[45%] p-3 rounded-lg items-center ${scanMode === 'barcode' ? 'bg-brand/10 border border-brand/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Ionicons 
                    name="barcode-outline" 
                    size={28} 
                    color={scanMode === 'barcode' ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280')} 
                  />
                  <ThemedText 
                    variant={scanMode === 'barcode' ? 'brand' : 'default'} 
                    size="sm" 
                    className="mt-2 text-center"
                  >
                    Code-barres
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setScanMode('qr')}
                  className={`flex-1 min-w-[45%] p-3 rounded-lg items-center ${scanMode === 'qr' ? 'bg-brand/10 border border-brand/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Ionicons 
                    name="qr-code-outline" 
                    size={28} 
                    color={scanMode === 'qr' ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280')} 
                  />
                  <ThemedText 
                    variant={scanMode === 'qr' ? 'brand' : 'default'} 
                    size="sm" 
                    className="mt-2 text-center"
                  >
                    QR Code
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setScanMode('text')}
                  className={`flex-1 min-w-[45%] p-3 rounded-lg items-center ${scanMode === 'text' ? 'bg-brand/10 border border-brand/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Ionicons 
                    name="document-text-outline" 
                    size={28} 
                    color={scanMode === 'text' ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280')} 
                  />
                  <ThemedText 
                    variant={scanMode === 'text' ? 'brand' : 'default'} 
                    size="sm" 
                    className="mt-2 text-center"
                  >
                    Liste papier
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setScanMode('list')}
                  className={`flex-1 min-w-[45%] p-3 rounded-lg items-center ${scanMode === 'list' ? 'bg-brand/10 border border-brand/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Ionicons 
                    name="search-outline" 
                    size={28} 
                    color={scanMode === 'list' ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280')} 
                  />
                  <ThemedText 
                    variant={scanMode === 'list' ? 'brand' : 'default'} 
                    size="sm" 
                    className="mt-2 text-center"
                  >
                    Recherche texte
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
          
          {/* Quick actions */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <ThemedText variant="subheading" className="mb-3">
                Actions rapides
              </ThemedText>
              
              <View className="flex-row flex-wrap gap-2">
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    onPress={action.onPress}
                    className="flex-1 min-w-[45%] p-3 rounded-lg items-center bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
                  >
                    <View 
                      className="w-10 h-10 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: `${action.color}20` }}
                    >
                      <Ionicons name={action.icon as any} size={20} color={action.color} />
                    </View>
                    <ThemedText variant="default" size="xs" className="text-center">
                      {action.title}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
          
          {/* Main content based on mode */}
          {scanMode === 'text' && renderListInput()}
          {(scanMode === 'barcode' || scanMode === 'qr') && renderManualBarcode()}
          {scanMode === 'list' && (
            <View className="p-4">
              <Input
                placeholder="Rechercher un produit par nom, SKU ou description..."
                leftIcon="search-outline"
                onChangeText={searchProductByText}
              />
            </View>
          )}
          
          {/* Recent scans */}
          {scanResults.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <View className="flex-row justify-between items-center mb-3">
                  <ThemedText variant="subheading">
                    Scans récents
                  </ThemedText>
                  <TouchableOpacity onPress={clearResults}>
                    <ThemedText variant="muted" size="sm">
                      Effacer tout
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={scanResults}
                  keyExtractor={(item, index) => `${item.data}-${index}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => copyToClipboard(item.data)}
                      className="py-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={item.type === 'barcode' ? 'barcode-outline' : 'qr-code-outline'} 
                            size={20} 
                            className="mr-3 text-gray-500"
                          />
                          <View>
                            <ThemedText variant="default" size="sm">
                              {item.data.length > 30 ? `${item.data.substring(0, 30)}...` : item.data}
                            </ThemedText>
                            <ThemedText variant="muted" size="xs">
                              {item.timestamp.toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </ThemedText>
                          </View>
                        </View>
                        <Ionicons name="copy-outline" size={18} className="text-gray-400" />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Found products */}
          {foundProducts.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-4">
                <View className="flex-row justify-between items-center mb-3">
                  <ThemedText variant="subheading">
                    Produits trouvés
                  </ThemedText>
                  <Badge variant="success">{foundProducts.length}</Badge>
                </View>
                
                <FlatList
                  data={foundProducts.slice(0, 5)}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => router.push(`/(auth)/edit-product/${item.id}`)}
                      className="py-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <ThemedText variant="default" size="sm">
                            {item.name}
                          </ThemedText>
                          <View className="flex-row items-center mt-1">
                            <ThemedText variant="muted" size="xs" className="mr-3">
                              SKU: {item.sku}
                            </ThemedText>
                            {item.barcode && (
                              <ThemedText variant="muted" size="xs">
                                Code: {item.barcode}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                        <View className="items-end">
                          <ThemedText variant="default" size="sm">
                            {item.stockQuantity || 0} en stock
                          </ThemedText>
                          <ThemedText variant="success" size="xs">
                            ₣{item.sellingPricePerBase?.toFixed(2) || '0.00'}
                          </ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                
                {foundProducts.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(tabs)/products')}
                    className="mt-3"
                  >
                    Voir tous les produits ({foundProducts.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>
    );
  };
  
  // Render scan button
  const renderScanButton = () => {
    if (scanMode === 'text' || scanMode === 'list') return null;
    
    return (
      <TouchableOpacity
        onPress={toggleCamera}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-brand items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons 
          name={isCameraActive ? 'close' : 'camera'} 
          size={28} 
          color="white" 
        />
      </TouchableOpacity>
    );
  };
  
  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Scanner" 
        showBackButton
        rightAction={
          <Button 
            variant="ghost" 
            size="sm"
            onPress={clearResults}
            disabled={scanResults.length === 0}
          >
            Effacer
          </Button>
        }
      />
      
      {isCameraActive ? renderCamera() : renderMainContent()}
      
      {renderScanButton()}
      
      {/* Processing overlay */}
      {isProcessing && (
        <Modal transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="bg-white dark:bg-gray-800 p-6 rounded-2xl items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <ThemedText variant="default" className="mt-4">
                Recherche en cours...
              </ThemedText>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});