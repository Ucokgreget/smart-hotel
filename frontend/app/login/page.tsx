import { SignInDemo } from "@/components/demo/sign-in-demo"

// Read on the server so the client component never needs useSearchParams, which
// would otherwise force a Suspense boundary around this page.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return <SignInDemo next={next} />
}
