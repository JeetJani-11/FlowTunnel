"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/firebase/config";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  console.log(pathname)
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background p-3">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Flow Tunnel</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <>
            {/* If on profile dont show profile same for sigin and signup */}
              {pathname != "/profile" && (
                <Link href="/profile">
                  <Button variant="outline">Profile</Button>
                </Link>
              )}
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              {pathname !== "/login" && (
                <Link href="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
              )}
              {pathname !== "/signUp" && (
                <Link href="/signUp">
                  <Button>Sign Up</Button>
                </Link>
              )}
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-b">
          <div className="container py-4 space-y-4">
            <nav className="flex flex-col space-y-4">
              <Link href="/docs" onClick={() => setIsMenuOpen(false)}>
                Documentation
              </Link>
              <Link href="/pricing" onClick={() => setIsMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/about" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
            </nav>
            <div className="flex flex-col space-y-2">
              {user ? (
                <>
                  {/* If on profile dont show profile same for sigin and signup */}
                  {pathname != "/profile" && (
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Profile
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  {pathname !== "/login" && (
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  )}
                  {pathname !== "/signUp" && (
                    <Link href="/signUp" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full">Sign Up</Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
