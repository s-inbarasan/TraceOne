import * as React from "react"

export function GeminiLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2C12 2 12.5 8.5 18 12C12.5 15.5 12 22 12 22C12 22 11.5 15.5 6 12C11.5 8.5 12 2 12 2Z" fill="url(#gemini-grad)" />
      <path d="M19 5C19 5 19.2 7.2 21 8C19.2 8.8 19 11 19 11C19 11 18.8 8.8 17 8C18.8 7.2 19 5 19 5Z" fill="url(#gemini-grad-small)" />
      <defs>
        <linearGradient id="gemini-grad" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F80ED" />
          <stop offset="0.5" stopColor="#9B51E0" />
          <stop offset="1" stopColor="#F2C94C" />
        </linearGradient>
        <linearGradient id="gemini-grad-small" x1="17" y1="5" x2="21" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F80ED" />
          <stop offset="1" stopColor="#9B51E0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function OpenAILogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.603 2.012a4.417 4.417 0 0 0-4.321 3.242 4.385 4.385 0 0 0-3.327 3.324 4.417 4.417 0 0 0 1.258 5.12 4.417 4.417 0 0 0-1.258 5.122 4.385 4.385 0 0 0 3.327 3.323 4.417 4.417 0 0 0 4.321 3.245 4.417 4.417 0 0 0 4.321-3.245 4.385 4.385 0 0 0 3.327-3.323 4.417 4.417 0 0 0-1.258-5.122 4.417 4.417 0 0 0 1.258-5.12 4.385 4.385 0 0 0-3.327-3.324 4.417 4.417 0 0 0-4.321-3.242zm2.091 2.274a2.21 2.21 0 0 1 1.705 1.954l-4.717 2.723-2.158-1.246 5.17-2.986 1-.445zm-6.273 2.1a2.193 2.193 0 0 1 2.213-.3l1.838 1.062V12.6l-3.315-1.913V6.386zm-.437 6.27l1.477-.852 3.315 1.914v3.825l-4.792-2.766a2.21 2.21 0 0 1-.954-1.705l.954-.416zm3.32 6.71a2.21 2.21 0 0 1-1.705-1.954l4.717-2.723 2.158 1.246-5.17 2.986-1 .445zm6.273-2.1a2.193 2.193 0 0 1-2.213.3l-1.838-1.062V7.4l3.315 1.913v4.301zm.437-6.27l-1.477.852-3.315-1.914V7.525l4.792 2.766c.553.375.89 1.01.954 1.705l-.954.416z"
        fill="currentColor"
      />
    </svg>
  )
}

export function AnthropicLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.882 14.542h-1.815l-1.026-2.618H10.96l-1.026 2.618H8.118L11.083 8h1.833l2.966 8.542zm-2.315-4.148L12 8.423l-1.567 3.971h3.134z"
        fill="currentColor"
      />
    </svg>
  )
}

export function NvidiaLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 10c0-2.485-2.015-4.5-4.5-4.5S7.5 9.515 7.5 12s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5zm-4.5-3c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"
        fill="currentColor"
      />
      <path
        d="M12 5.5c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.884 0 3.585-.801 4.778-2.086A7.96 7.96 0 0 1 12 18c-3.314 0-6-2.686-6-6s2.686-6 6-6c1.848 0 3.513.836 4.63 2.155A6.47 6.47 0 0 0 12 5.5z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  )
}

export function GroqLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.5h-2v-5H8.5l4.5-6.5v5h2.5l-4.5 6.5z"
        fill="currentColor"
      />
    </svg>
  )
}
