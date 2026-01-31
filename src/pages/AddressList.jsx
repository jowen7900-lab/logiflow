import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  MapPin, 
  Edit2, 
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function AddressList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    contact_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    notes: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isCustomer = user?.app_role === 'customer' || user?.app_role === 'customer_admin';

  if (user && !isCustomer) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">Only customer users can access address list</p>
      </div>
    );
  }

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['savedAddresses', user?.id],
    queryFn: () => base44.entities.SavedAddress.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedAddress.create({ ...data, user_id: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedAddresses']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavedAddress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedAddresses']);
      setDialogOpen(false);
      setEditingAddress(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedAddress.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedAddresses']);
      setDeleteDialog(null);
    },
  });

  const resetForm = () => {
    setFormData({
      label: '',
      contact_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      postcode: '',
      notes: '',
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const handleEdit = (address) => {
    setFormData({
      label: address.label || '',
      contact_name: address.contact_name || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      postcode: address.postcode || '',
      notes: address.notes || '',
    });
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isValid = formData.label && formData.contact_name && formData.line1 && formData.postcode;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Address List</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your saved addresses for quick booking</p>
        </div>
        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">No saved addresses yet</p>
            <Button onClick={handleAdd} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{address.label}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{address.contact_name}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  {address.city && <p>{address.city}</p>}
                  <p className="font-medium mt-1">{address.postcode}</p>
                  {address.phone && (
                    <p className="text-slate-500 mt-2">
                      📞 {address.phone}
                    </p>
                  )}
                </div>
                {address.notes && (
                  <p className="text-xs text-slate-500 italic border-t pt-2">
                    {address.notes}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(address)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialog(address)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
            <DialogDescription>
              {editingAddress ? 'Update address details' : 'Save a new address for quick booking'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Label *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g. Home, Warehouse, Mum's"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Full name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact number"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Address Line 1 *</Label>
              <Input
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                placeholder="Street address"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Address Line 2</Label>
              <Input
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                placeholder="Apt, suite, building (optional)"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Postcode *</Label>
                <Input
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  placeholder="e.g. SW1A 1AA"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Access instructions, parking notes, etc."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingAddress ? 'Update' : 'Save'} Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteDialog?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}