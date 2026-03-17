"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="relative grid gap-8 overflow-x-hidden md:grid-cols-2">
          <div className="relative md:order-2">
            <div className="absolute -left-10 -top-10 -z-10 h-72 w-72 rounded-full bg-[#3B82F6] blur-3xl opacity-20" />
            <img
              src="/hero-model.jpg"
              alt="Fashion model"
              className="w-full rounded-2xl object-cover shadow-2xl brightness-105"
            />
          </div>

          <div className="flex flex-col justify-between md:order-1">
            <div className="flex h-full flex-col justify-between">
              <h1 className="text-6xl font-bold leading-tight tracking-tighter text-black md:text-7xl">
                LOODI.
              </h1>

              <ul className="space-y-2 pt-10 text-lg tracking-tight text-black/90">
                {["Record", "Insight", "Reward", "Style DNA", "Closet AI"].map((item) => (
                  <li key={item} className="opacity-85 transition duration-300 hover:-translate-y-1 hover:opacity-100">
                    <a href="#" className="cursor-pointer">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="pt-8">
                <h2 className="text-2xl font-medium text-black">Your Style, Recorded.</h2>
                <p className="max-w-md pt-4 text-lg tracking-tight text-black/95">
                  AI fashion diary experience inspired by Instagram speed, Notion clarity, and Spotify-level personalization.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link href="/signup">
                    <Button>Start Signup</Button>
                  </Link>
                  <Link href="/home">
                    <Button variant="outline">Preview App</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
