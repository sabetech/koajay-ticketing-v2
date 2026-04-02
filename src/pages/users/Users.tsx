import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Edit, Trash2, UserPlus, Loader2, RotateCcw } from "lucide-react";

import { userService, type User } from "@/services/users";
import { getImageUrl } from "@/lib/utils";

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Add User Form State
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fname: "",
        lname: "",
        email: "",
        password: "",
        phone: "",
        role: "agent", // Default to Agent
    });
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

    // Deletion State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [restoringUserId, setRestoringUserId] = useState<number | null>(null);

    // Edit User Form State
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        fname: "",
        lname: "",
        phone: "",
        password: "",
    });
    const [editPhoto, setEditPhoto] = useState<File | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userToEdit) {
            setEditFormData({
                fname: userToEdit.fname || "",
                lname: userToEdit.lname || "",
                phone: userToEdit.phone || "",
                password: "", // Always empty initially for security
            });
            setEditPhoto(null);
            setFormError(null);
        }
    }, [userToEdit]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.target.id;
        const val = e.target.value;
        setFormData(prev => ({ ...prev, [id]: val }));
        setFormError(null);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.target.id.replace('edit-', '');
        const val = e.target.value;
        setEditFormData(prev => ({ ...prev, [id]: val }));
        setFormError(null);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedPhoto(e.target.files[0]);
        }
    };

    const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setEditPhoto(e.target.files[0]);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        try {
            const data = new FormData();
            data.append("fname", formData.fname);
            data.append("lname", formData.lname);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("phone", formData.phone);
            data.append("role", formData.role);

            // Auto-generate username: fname.initial-of-lname
            const initialOfLname = formData.lname.charAt(0).toUpperCase();
            const username = `${formData.fname}.${initialOfLname}`;
            data.append("username", username);

            if (selectedPhoto) {
                data.append("user_image", selectedPhoto);
            }

            await userService.createUser(data);

            setIsAddUserModalOpen(false);
            setFormData({ fname: "", lname: "", email: "", password: "", phone: "", role: "agent" });
            setSelectedPhoto(null);
            fetchUsers();
        } catch (error: any) {
            console.error("Failed to create user:", error);

            let errorMessage = error.response?.data?.message || error.message || "Failed to create user. Please check your inputs.";

            // Handle structured validation errors from the server
            if (error.response?.data?.data && typeof error.response.data.data === 'object') {
                const validationErrors = error.response.data.data;
                const errorDetails = Object.keys(validationErrors).map(field => {
                    const messages = validationErrors[field];
                    return Array.isArray(messages) ? messages.join(" ") : messages;
                }).join(" | ");

                if (errorDetails) {
                    errorMessage = `${errorMessage} (${errorDetails})`;
                }
            }

            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;

        setIsSubmitting(true);
        setFormError(null);

        try {
            const data = new FormData();
            data.append("fname", editFormData.fname);
            data.append("lname", editFormData.lname);
            data.append("phone", editFormData.phone);
            
            if (editFormData.password) {
                data.append("password", editFormData.password);
            }

            if (editPhoto) {
                data.append("user_image", editPhoto);
            }

            await userService.updateUser(userToEdit.id, data);

            setUserToEdit(null);
            fetchUsers();
        } catch (error: any) {
            console.error("Failed to update user:", error);
            let errorMessage = error.response?.data?.message || error.message || "Failed to update user.";
            if (error.response?.data?.data && typeof error.response.data.data === 'object') {
                const validationErrors = error.response.data.data;
                const errorDetails = Object.keys(validationErrors).map(field => {
                    const messages = validationErrors[field];
                    return Array.isArray(messages) ? messages.join(" ") : messages;
                }).join(" | ");
                if (errorDetails) errorMessage = `${errorMessage} (${errorDetails})`;
            }
            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        setIsDeleting(true);
        try {
            await userService.deleteUser(userToDelete.id);
            fetchUsers();
            setUserToDelete(null);
        } catch (error) {
            console.error("Failed to delete user:", error);
            // Optionally show a toast or alert for deletion failure
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRestoreUser = async (id: number) => {
        setRestoringUserId(id);
        try {
            await userService.restoreUser(id);
            fetchUsers();
        } catch (error) {
            console.error("Failed to restore user:", error);
        } finally {
            setRestoringUserId(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.fname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.lname?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">User Management</h1>
                    <p className="text-sm text-muted-foreground">Manage system users, roles, and permissions.</p>
                </div>

                <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleAddUser}>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {formError && (
                                    <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20">
                                        {formError}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fname">First Name</Label>
                                        <Input id="fname" required value={formData.fname} onChange={handleFormChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lname">Last Name</Label>
                                        <Input id="lname" required value={formData.lname} onChange={handleFormChange} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" required value={formData.email} onChange={handleFormChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" required value={formData.phone} onChange={handleFormChange} placeholder="e.g. 0244123456" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" required value={formData.password} onChange={handleFormChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2">Admin</SelectItem>
                                                <SelectItem value="4">Supervisor</SelectItem>
                                                <SelectItem value="5">Agent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="photo">Profile Image</Label>
                                        <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs pt-1.5" />
                                    </div>
                                </div>

                                {formData.fname && formData.lname && (
                                    <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded italic">
                                        Generated username: <span className="font-bold">{formData.fname}.{formData.lname.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Users</CardTitle>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name or email..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Photo</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                <span>Loading users...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No users found for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className={user.deleted_at ? "opacity-60 bg-muted/30 select-none grayscale" : ""}>
                                            <TableCell>
                                                <Avatar className="h-10 w-10 border">
                                                    <AvatarImage src={getImageUrl(user.photo) || ""} alt={user.fname + " " + user.lname} />
                                                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                                        {user?.fname?.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.fname + " " + user.lname}
                                                    {user.deleted_at && (
                                                        <Badge variant="destructive" className="h-4 px-1.5 text-[10px] leading-3 uppercase font-bold tracking-wider">
                                                            Deleted
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize font-medium">
                                                    {user.roles?.[0]?.name || "User"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {user.deleted_at ? (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 gap-1 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary"
                                                            onClick={() => handleRestoreUser(user.id)}
                                                            disabled={restoringUserId === user.id}
                                                        >
                                                            {restoringUserId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                                            Restore
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setUserToEdit(user)}>
                                                                <Edit className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                            
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 hover:bg-destructive/10"
                                                                onClick={() => setUserToDelete(user)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit User Modal */}
            <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleUpdateUser}>
                        <DialogHeader>
                            <DialogTitle>Edit User: {userToEdit?.fname} {userToEdit?.lname}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {formError && (
                                <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20">
                                    {formError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-fname">First Name</Label>
                                    <Input id="edit-fname" required value={editFormData.fname} onChange={handleEditFormChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-lname">Last Name</Label>
                                    <Input id="edit-lname" required value={editFormData.lname} onChange={handleEditFormChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone Number</Label>
                                <Input id="edit-phone" type="tel" required value={editFormData.phone} onChange={handleEditFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                                <Input id="edit-password" type="password" value={editFormData.password} onChange={handleEditFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-photo">Profile Image (optional)</Label>
                                <Input id="edit-photo" type="file" accept="image/*" onChange={handleEditPhotoChange} className="text-xs pt-1.5" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setUserToEdit(null)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user
                            <span className="font-bold text-foreground mx-1">{userToDelete?.fname} {userToDelete?.lname}</span>
                            and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteUser();
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
