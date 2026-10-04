"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <Card className="border border-white/12 py-6 ring-0 backdrop-blur-[18px]">
      <CardHeader className="px-6">
        <CardTitle className="text-base font-medium">Set your password</CardTitle>
        <CardDescription>{email ? `For ${email}.` : "Choose a password to finish signing in."}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-10"
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
              {isLoading ? "Saving…" : "Save and continue"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
