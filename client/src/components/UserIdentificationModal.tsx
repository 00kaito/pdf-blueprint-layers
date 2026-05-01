import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const UserIdentificationModal = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("technician_name");
    if (!storedName) {
      setOpen(true);
    }
  }, []);

  const handleSave = () => {
    if (name.trim()) {
      localStorage.setItem("technician_name", name.trim());
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Technician Identification</DialogTitle>
          <DialogDescription>
            Please enter your name to proceed. This will be used to track status updates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. John Doe"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
