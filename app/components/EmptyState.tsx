import type { ReactNode } from "react";
import { Card, Heading, Text } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-dashed border-orange-200 bg-white/90 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-[#d73f09]">
        <MagnifyingGlassIcon />
      </div>
      <Heading size="4" className="text-gray-950">
        {title}
      </Heading>
      <Text as="p" color="gray" className="mx-auto mt-2 max-w-sm">
        {body}
      </Text>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}
