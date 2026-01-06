'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreditBalance from './credit-balance';

export default function Header() {
  const pathname = usePathname();
  const isProcessingPage = pathname?.startsWith('/processing/');
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {isProcessingPage ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ClipForge</span>
            </div>
          ) : (
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ClipForge</span>
            </Link>
          )}
          
          <div className="flex items-center gap-4">
            {!isProcessingPage && !isAuthPage && (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      ログイン
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      無料で始める
                    </Button>
                  </SignUpButton>
                </SignedOut>
                
                <SignedIn>
                  <CreditBalance />
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                      },
                    }}
                  />
                </SignedIn>
              </>
            )}
            
            {isProcessingPage && (
              <div className="text-sm text-gray-500">
                処理中...
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

