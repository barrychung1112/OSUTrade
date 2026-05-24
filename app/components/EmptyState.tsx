import type { ReactNode } from "react";
import { Card, Heading, Text } from "@radix-ui/themes";

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
    <Card className="border border-dashed border-orange-200 bg-white/70 px-6 py-10 text-center shadow-sm">
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
