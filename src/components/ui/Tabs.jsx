import { forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

// Tabs (F5, shadcn/ui style on @radix-ui/react-tabs): role=tablist / tab / tabpanel wired with aria-selected,
// aria-controls and aria-labelledby; arrow keys / Home / End move between tabs (automatic activation).
// Unstyled: callers pass their Tailwind classes (data-[state=active]:... or their own conditional classes).
//
//   <Tabs value={tab} onValueChange={setTab}>
//       <TabsList aria-label="Sections"><TabsTrigger value="a">A</TabsTrigger>...</TabsList>
//       <TabsContent value="a">...</TabsContent>
//   </Tabs>

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef(function TabsList(props, ref) {
    return <TabsPrimitive.List ref={ref} {...props} />;
});

export const TabsTrigger = forwardRef(function TabsTrigger({ className = '', ...props }, ref) {
    return <TabsPrimitive.Trigger ref={ref} className={`outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`} {...props} />;
});

export const TabsContent = forwardRef(function TabsContent({ className = '', ...props }, ref) {
    return <TabsPrimitive.Content ref={ref} className={`outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg ${className}`} {...props} />;
});

export default Tabs;
